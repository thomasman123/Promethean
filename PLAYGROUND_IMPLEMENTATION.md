# Advanced Playground Implementation

## Overview

The playground has been completely rebuilt from scratch with tldraw integration, providing a Miro-style infinite canvas for sales managers to create visual dashboards with embedded data widgets.

## What's Included

### 1. Database Schema
- **playground_boards**: One board per account
- **playground_pages**: Multiple pages per board (like Notion)
- **playground_page_content**: Stores tldraw drawings + widget configurations
- All tables have RLS policies for account-based access control

### 2. Features

#### Drawing & Canvas
- Full tldraw capabilities:
  - Freehand drawing with pencil tool
  - Shapes (rectangles, circles, arrows, lines, etc.)
  - Text annotations
  - Sticky notes
  - Infinite canvas with pan and zoom
  - Selection, move, resize, rotate
  - Undo/redo support

#### Dashboard Widgets
- Embed any dashboard widget type:
  - KPI Metrics
  - Bar Charts
  - Line Charts
  - Area Charts
  - Data Views
- **Per-widget date ranges**: Each widget has its own date picker
- Account filtering is global (based on selected account in topbar)
- Auto-save functionality with debouncing

#### Page Management (Notion-style)
- Create new pages
- Rename pages (inline editing)
- Duplicate pages (copies all content)
- Delete pages (with confirmation)
- Collapsible sidebar for more canvas space

### 3. File Structure

```
src/
├── app/
│   ├── api/playground/
│   │   ├── boards/route.ts         # Get/create boards
│   │   └── pages/
│   │       ├── route.ts            # Create/update/delete pages
│   │       └── [pageId]/content/
│   │           └── route.ts        # Load/save page content
│   └── playground/
│       └── page.tsx                # Main playground page
└── components/playground/
    ├── page-manager-sidebar.tsx    # Notion-style page navigation
    ├── playground-widget.tsx       # Widget wrapper with date picker
    └── widget-config-dialog.tsx    # Widget selection modal

supabase/migrations/
└── 20250111000000_create_playground_tables.sql
```

## Next Steps

### 1. Apply Database Migration

You need to apply the migration to your database:

```bash
# Using Supabase CLI
supabase db push

# Or apply manually through Supabase Dashboard
# Copy the contents of supabase/migrations/20250111000000_create_playground_tables.sql
# and run in the SQL Editor
```

### 2. Test the Playground

1. Start your development server (if not already running)
2. Navigate to `/playground`
3. Select an account from the topbar
4. The system will automatically:
   - Create a default board for the account
   - Create an initial "Untitled Page"

### 3. How to Use

#### Adding Widgets
1. Click the "Add Widget" button in the top toolbar
2. Select widget type (KPI, Bar Chart, Line Chart, Area Chart, Data View)
3. Choose metric(s) from the dropdown
4. The widget appears in the center of your viewport
5. Each widget has its own date range picker at the top

#### Drawing
- Use the tldraw toolbar to:
  - Draw freehand
  - Add shapes, arrows, text
  - Select and move elements
  - Pan (spacebar + drag or hand tool)
  - Zoom (scroll or zoom controls)

#### Managing Pages
- Click "New Page" to create additional pages
- Right-click (or click the three dots) on any page to:
  - Rename
  - Duplicate
  - Delete (can't delete last page)
- Click a page name to switch to it
- All changes auto-save after 2 seconds

#### Saving
- Changes auto-save every 2 seconds
- Click "Save Now" to save immediately
- Watch the saving indicator in the top-right

## Known Limitations & Future Enhancements

### Current Limitations
1. **React 19 Compatibility**: tldraw requires React 18, installed with `--legacy-peer-deps`
   - This shouldn't cause issues but be aware if you see peer dependency warnings
2. **Widget Positioning**: Widgets are overlaid on the canvas rather than being native tldraw shapes
   - They don't integrate with tldraw's selection/transform system
   - Positioned in viewport coordinates

### Potential Enhancements
1. **Real-time Collaboration**: Database structure supports it, but needs:
   - WebSocket integration
   - Supabase Realtime subscriptions
   - Conflict resolution

2. **Better Widget Integration**: 
   - Convert widgets to custom tldraw shapes for better integration
   - Allow resizing widgets by dragging handles
   - Enable widget selection within tldraw

3. **Templates**: 
   - Pre-built page templates for common use cases
   - Export/import page layouts

4. **Advanced Features**:
   - Page folders/organization
   - Search across pages
   - Comments/annotations
   - Version history

## Technical Notes

### Auto-save Implementation
- Uses debounced saving (2-second delay)
- Saves both tldraw document state and widget configurations
- Prevents save conflicts with loading state checks

### Account Scoping
- All data is automatically filtered by the selected account
- Users can only access boards/pages for accounts they have permissions for
- RLS policies enforce security at the database level

### Widget Date Ranges
- Each widget maintains its own date range state
- Defaults to current month when created
- Independent of the global dashboard date range
- Updates trigger automatic data refetching

## Troubleshooting

### Issue: "Select an account" message
**Solution**: Choose an account from the topbar dropdown

### Issue: No pages showing
**Solution**: The board and initial page should be created automatically. Check:
1. Database migration was applied
2. User has proper account_access permissions
3. Check browser console for API errors

### Issue: Widgets not displaying data
**Solution**: 
1. Verify account is selected
2. Check widget date range is valid
3. Ensure metrics API is working properly
4. Check browser console for errors

### Issue: tldraw not loading
**Solution**:
1. Verify tldraw was installed: `npm list tldraw`
2. Check for console errors
3. Clear node_modules and reinstall if needed

## Support

If you encounter issues:
1. Check the browser console for errors
2. Verify database migration was applied
3. Check API route responses in Network tab
4. Ensure RLS policies are working correctly

