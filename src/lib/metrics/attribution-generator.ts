import { MetricDefinition } from './types'

/**
 * Attribution contexts and their descriptions
 */
export const ATTRIBUTION_CONTEXTS = {
  assigned: {
    label: 'Assigned',
    description: 'Attributed to the assigned sales rep (sales_rep_user_id)',
    emoji: '👤',
    suffix: '_assigned'
  },
  booked: {
    label: 'Booked',
    description: 'Attributed to the person who booked it (setter_user_id)',
    emoji: '📅',
    suffix: '_booked'
  },
  dialer: {
    label: 'Dialer',
    description: 'Attributed to the person who made the dial (setter_user_id)',
    emoji: '📞',
    suffix: '_dialer'
  }
} as const

/**
 * Determines which attribution contexts are applicable for a given table
 */
export function getApplicableAttributions(table: string): Array<keyof typeof ATTRIBUTION_CONTEXTS> {
  switch (table) {
    case 'appointments':
    case 'discoveries':
      return ['assigned', 'booked']
    case 'dials':
      return ['dialer']
    default:
      return []
  }
}

/**
 * Automatically generates attribution variants for a base metric definition
 * 
 * @param baseMetricName - The base metric name (without attribution suffix)
 * @param baseDefinition - The base metric definition
 * @returns Object with attribution variants
 */
export function generateAttributionVariants(
  baseMetricName: string,
  baseDefinition: Omit<MetricDefinition, 'attributionContext'>
): Record<string, MetricDefinition> {
  const variants: Record<string, MetricDefinition> = {}
  
  // Get applicable attributions for this table
  const applicableAttributions = getApplicableAttributions(baseDefinition.query.table)
  
  // Generate variants for each applicable attribution
  for (const attribution of applicableAttributions) {
    const context = ATTRIBUTION_CONTEXTS[attribution]
    const variantName = `${baseMetricName}${context.suffix}`
    
    variants[variantName] = {
      ...baseDefinition,
      name: `${baseDefinition.name} (${context.label})`,
      description: `${baseDefinition.description} - ${context.description}`,
      attributionContext: attribution
    }
  }
  
  // Also include the legacy version (without attribution context)
  variants[baseMetricName] = {
    ...baseDefinition,
    name: baseDefinition.name,
    description: baseDefinition.description
    // No attributionContext = legacy behavior
  }
  
  return variants
}

/**
 * Helper to create a complete metric family (base + all attribution variants)
 * 
 * @param baseMetricName - The base metric name
 * @param baseDefinition - The base metric definition
 * @returns Complete metric family with all variants
 */
export function createMetricFamily(
  baseMetricName: string,
  baseDefinition: Omit<MetricDefinition, 'attributionContext'>
): Record<string, MetricDefinition> {
  return generateAttributionVariants(baseMetricName, baseDefinition)
}

/**
 * Batch create multiple metric families
 */
export function createMetricFamilies(
  metrics: Record<string, Omit<MetricDefinition, 'attributionContext'>>
): Record<string, MetricDefinition> {
  const allMetrics: Record<string, MetricDefinition> = {}
  
  for (const [baseName, baseDefinition] of Object.entries(metrics)) {
    const family = createMetricFamily(baseName, baseDefinition)
    Object.assign(allMetrics, family)
  }
  
  return allMetrics
}

/**
 * Check if a metric needs attribution variants based on its table
 */
export function needsAttributionVariants(metric: MetricDefinition): boolean {
  const applicableAttributions = getApplicableAttributions(metric.query.table)
  return applicableAttributions.length > 0
}

/**
 * Get the attribution context from a metric name
 */
export function getAttributionFromMetricName(metricName: string): keyof typeof ATTRIBUTION_CONTEXTS | null {
  for (const [attribution, context] of Object.entries(ATTRIBUTION_CONTEXTS)) {
    if (metricName.endsWith(context.suffix)) {
      return attribution as keyof typeof ATTRIBUTION_CONTEXTS
    }
  }
  return null
}

/**
 * Get the base metric name (without attribution suffix)
 */
export function getBaseMetricName(metricName: string): string {
  for (const context of Object.values(ATTRIBUTION_CONTEXTS)) {
    if (metricName.endsWith(context.suffix)) {
      return metricName.replace(context.suffix, '')
    }
  }
  return metricName
} 