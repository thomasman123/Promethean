# Sales Dashboard Metrics Middleware

A powerful, extensible backend middleware system for calculating sales metrics from Supabase data with consistent filtering and support for single-entity and multi-entity comparison modes.

## 🚀 Features

- **Centralized Metrics Registry**: All metrics defined in one place
- **Consistent Filtering**: Date range, account, rep, and setter filters applied automatically
- **Multiple Breakdown Types**: Total, Rep, Setter, and Link (setter→rep) breakdowns
- **Comparison Mode**: Support for multi-entity comparisons
- **Type Safety**: Full TypeScript support
- **Extensible**: Easy to add new metrics
- **Performance**: Optimized SQL queries with proper indexing

## 📊 Breakdown Types

### 1. **Total** (`'total'`)
Returns a single aggregated value across all data.
```typescript
{ type: 'total', data: { value: 142 } }
```

### 2. **Rep** (`'rep'`)
Groups results by sales rep.
```typescript
{ 
  type: 'rep', 
  data: [
    { repId: 'uuid1', repName: 'John Doe', value: 25 },
    { repId: 'uuid2', repName: 'Jane Smith', value: 18 }
  ] 
}
```

### 3. **Setter** (`'setter'`)
Groups results by setter.
```typescript
{ 
  type: 'setter', 
  data: [
    { setterId: 'uuid1', setterName: 'Alice Johnson', value: 34 },
    { setterId: 'uuid2', setterName: 'Bob Wilson', value: 29 }
  ] 
}
```

### 4. **Link** (`'link'`)
Shows the relationship between setters and reps.
```typescript
{ 
  type: 'link', 
  data: [
    { setterId: 'uuid1', setterName: 'Alice', repId: 'uuid3', repName: 'John', value: 12 },
    { setterId: 'uuid1', setterName: 'Alice', repId: 'uuid4', repName: 'Jane', value: 8 }
  ] 
}
```

## 📋 Available Metrics

| Metric Name | Description | Breakdown Type |
|-------------|-------------|----------------|
| `total_appointments` | Total count of appointments | `total` |
| `total_appointments_reps` | Appointments grouped by rep | `rep` |
| `total_appointments_setters` | Appointments grouped by setter | `setter` |
| `appointments_link` | Appointments showing setter→rep links | `link` |
| `show_rate_reps` | Show rate percentage by rep | `rep` |
| `close_rate_reps` | Close rate percentage by rep | `rep` |
| `total_revenue_reps` | Revenue (cash collected) by rep | `rep` |

## 🔧 Usage

### Basic Usage
```typescript
import { metricsEngine, createMetricRequest } from '@/lib/metrics'

// Get total appointments for an account
const request = createMetricRequest(
  'total_appointments',
  'account-uuid',
  '2024-01-01',
  '2024-01-31'
)

const result = await metricsEngine.execute(request)
```

### Single Rep Analysis
```typescript
const request = createMetricRequest(
  'total_appointments_reps',
  'account-uuid',
  '2024-01-01',
  '2024-01-31',
  { repIds: ['rep-uuid'] }
)
```

### Multi-Rep Comparison
```typescript
const request = createMetricRequest(
  'show_rate_reps',
  'account-uuid',
  '2024-01-01',
  '2024-01-31',
  { repIds: ['rep1-uuid', 'rep2-uuid', 'rep3-uuid'] }
)
```

### Setter → Rep Pipeline Analysis
```typescript
const request = createMetricRequest(
  'appointments_link',
  'account-uuid',
  '2024-01-01',
  '2024-01-31',
  { 
    setterIds: ['setter-uuid'], 
    repIds: ['rep1-uuid', 'rep2-uuid'] 
  }
)
```

## 🌐 API Endpoints

### POST `/api/metrics`
Execute a metric calculation.

**Request:**
```json
{
  "metricName": "total_appointments_reps",
  "filters": {
    "dateRange": {
      "start": "2024-01-01",
      "end": "2024-01-31"
    },
    "accountId": "account-uuid",
    "repIds": ["rep1-uuid", "rep2-uuid"]
  }
}
```

**Response:**
```json
{
  "metricName": "total_appointments_reps",
  "filters": { ... },
  "result": {
    "type": "rep",
    "data": [
      { "repId": "rep1-uuid", "repName": "John Doe", "value": 25 },
      { "repId": "rep2-uuid", "repName": "Jane Smith", "value": 18 }
    ]
  },
  "executedAt": "2024-01-15T10:30:00.000Z",
  "executionTimeMs": 156
}
```

### GET `/api/metrics`
Get list of available metrics.

**Response:**
```json
{
  "metrics": [
    "total_appointments",
    "total_appointments_reps",
    "show_rate_reps",
    ...
  ],
  "count": 7
}
```

## ➕ Adding New Metrics

Adding a new metric is simple - just add it to the registry:

```typescript
// In src/lib/metrics/registry.ts
export const METRICS_REGISTRY: Record<string, MetricDefinition> = {
  // ... existing metrics ...
  
  'conversion_rate_setters': {
    name: 'Conversion Rate (Setters)',
    description: 'Percentage of setter appointments that convert to shows',
    breakdownType: 'setter',
    query: {
      table: 'appointments',
      select: [
        'setter_user_id as setter_id',
        'ROUND((COUNT(CASE WHEN call_outcome = \'Show\' THEN 1 END) * 100.0 / COUNT(*)), 2) as value'
      ],
      joins: [
        {
          table: 'profiles',
          on: 'appointments.setter_user_id = profiles.id',
          type: 'LEFT'
        }
      ],
      groupBy: ['setter_user_id', 'profiles.full_name'],
      having: ['COUNT(*) > 0'],
      orderBy: ['value DESC']
    }
  }
}
```

That's it! The new metric is automatically available through the API and engine.

## 🏗️ Architecture

### Components

1. **Types** (`types.ts`): TypeScript interfaces and types
2. **Registry** (`registry.ts`): Central metric definitions
3. **Filters** (`filters.ts`): Consistent filtering logic
4. **Engine** (`engine.ts`): Query building and execution
5. **API** (`/api/metrics/route.ts`): HTTP endpoints

### Filter System

All metrics automatically support these filters:
- **Date Range**: `dateRange.start` and `dateRange.end` (required)
- **Account**: `accountId` (required)  
- **Reps**: `repIds` (optional array)
- **Setters**: `setterIds` (optional array)

### Database Function

The system uses a Supabase function `execute_metrics_query_array` to safely execute dynamic SQL with parameterized queries.

## 🔒 Security

- All queries use parameterized inputs to prevent SQL injection
- Database function runs with `SECURITY DEFINER`
- API endpoints require authentication
- Row Level Security (RLS) policies apply automatically

## 📈 Performance

- Optimized SQL queries with proper JOINs
- Database indexes on key fields (account_id, user_ids, dates)
- Parallel execution support for multiple metrics
- Query execution time tracking

## 🧪 Testing

Run metrics locally:

```typescript
import { getTotalAppointmentsForRep } from '@/lib/metrics/examples'

const result = await getTotalAppointmentsForRep(
  'your-account-id',
  'rep-user-id', 
  '2024-01-01',
  '2024-01-31'
)

console.log(result)
```

## 🚀 Deployment

1. Run the database migration:
   ```bash
   # This creates the execute_metrics_query_array function
   supabase db push
   ```

2. The middleware is ready to use via API or direct imports.

## 📝 Examples

See `examples.ts` for comprehensive usage examples including:
- Single rep analysis
- Multi-rep comparisons  
- Setter performance tracking
- Cross-role pipeline analysis
- Account overview dashboards 