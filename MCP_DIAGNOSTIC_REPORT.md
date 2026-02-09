# MCP Configuration Diagnostic Report

## Current Status
⚠️ **MCP is partially configured** - Global config exists but may need authentication

## Issues Identified

### 1. MCP Configuration Files
- **Global Config**: ✅ Found at `~/.cursor/mcp.json`
- **Workspace Config**: ❌ Not found (will use global)
- **Status**: Configuration exists but headers are empty

### 2. Current MCP Configuration
**Location**: `~/.cursor/mcp.json`

```json
{
  "mcpServers": {
    "supabase": {
      "url": "https://mcp.supabase.com/mcp?project_ref=xsmwzaaotncpharmtzcj&features=docs%2Caccount%2Cdatabase%2Cdebugging%2Cdevelopment%2Cfunctions%2Cbranching%2Cstorage",
      "headers": {}
    }
  }
}
```

**Issues**:
- ✅ URL is correctly configured with project reference
- ⚠️ **Headers are empty** - May need authentication for full functionality
- ⚠️ No environment variables configured

### 3. Current Supabase Configuration
From `lib/supabase.ts`:
- **URL**: `https://xsmwzaaotncpharmtzcj.supabase.co`
- **Anon Key**: Present (but this is NOT the service role key needed for MCP)

## Root Cause Analysis

### Primary Issue: MCP Server May Need Authentication
The Supabase hosted MCP server (`mcp.supabase.com`) uses the project reference in the URL, which may provide some authentication. However, for full functionality (especially for operations that require service role permissions), you may need to add authentication headers.

### Secondary Issues:
1. **Empty Headers**: The `headers: {}` object is empty - some operations may require authentication
2. **No Environment Variables**: While the URL-based auth might work, explicit env vars can help
3. **Resource vs Tools**: The MCP server might expose **tools** (functions you can call) but not **resources** (data you can list). This is why `list_mcp_resources()` returns empty.

### Why "No Resources Found"?
- The Supabase MCP server primarily exposes **tools** (like `get_edge_function`, `deploy_edge_function`, etc.)
- It may not expose **resources** (like a list of all edge functions as resources)
- To list edge functions, you need to use the **tools**, not resources

## Required Fix

### Option 1: Add Authentication Headers (Recommended)
Edit `~/.cursor/mcp.json` and add authentication:

1. **Get Your Supabase Service Role Key**:
   - Go to: https://supabase.com/dashboard/project/xsmwzaaotncpharmtzcj/settings/api
   - Find **Service Role Key** (⚠️ Keep secret - has admin access!)
   - Copy the key

2. **Update Global Config** (`~/.cursor/mcp.json`):
```json
{
  "mcpServers": {
    "supabase": {
      "url": "https://mcp.supabase.com/mcp?project_ref=xsmwzaaotncpharmtzcj&features=docs%2Caccount%2Cdatabase%2Cdebugging%2Cdevelopment%2Cfunctions%2Cbranching%2Cstorage",
      "headers": {
        "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY_HERE"
      }
    }
  }
}
```

3. **Restart Cursor** completely

### Option 2: Use MCP Tools Instead of Resources
The Supabase MCP server exposes **tools**, not resources. To list edge functions, use the tools:

**Available MCP Tools** (based on Supabase MCP server):
- `mcp_supabase_get_edge_function` - Get details of a specific edge function
- `mcp_supabase_list_edge_functions` - List all edge functions (if available)
- `mcp_supabase_deploy_edge_function` - Deploy an edge function
- `mcp_supabase_get_table` - Get table schema
- And more...

**To check available tools**: Look in Cursor's MCP settings or Output panel

## Verification Steps

After configuration, verify MCP is working:

1. **Check MCP Status**: 
   - Open Cursor's Output panel (View → Output)
   - Select "MCP" from the dropdown
   - Look for connection status and any errors

2. **Check Available Tools**:
   - Go to Cursor Settings → Features → Model Context Protocol
   - Find "supabase" server
   - Check if tools are listed and enabled

3. **Test MCP Tools**:
   - Try: "List all my Supabase edge functions"
   - The AI should use MCP tools to query Supabase

4. **Check for Errors**:
   - Look for authentication errors in MCP output
   - Check if tools are accessible

## Understanding: Tools vs Resources

**Important Distinction**:
- **Resources**: Data that can be listed/read (like files, database records)
- **Tools**: Functions that can be called (like API endpoints)

The Supabase MCP server primarily provides **tools**, not resources. This is why `list_mcp_resources()` returns empty - the server doesn't expose resources, it exposes tools that you can call to interact with Supabase.

## Edge Functions Found in Codebase

Based on code analysis, your project uses these edge functions:
1. `generate-barcode` - Generates barcode images
2. `verify-mobile-otp` - Verifies mobile OTP codes
3. `verify-gstin` - Verifies GSTIN numbers
4. `verify-gstin-otp` - Verifies GSTIN OTP
5. `verify-pan` - Verifies PAN numbers
6. `manage-addresses` - Manages business addresses
7. `manage-bank-accounts` - Manages bank accounts
8. `google-maps-geocode` - Geocoding via Google Maps
9. `manage-signup-progress` - Manages user signup flow
10. `manage-device-snapshots` - Device data snapshots
11. `manage-staff` - Staff management
12. `complete-onboarding` - Completes business onboarding

## Security Notes
⚠️ **IMPORTANT**: 
- The Service Role Key has full admin access to your Supabase project
- Never commit it to version control
- The global config at `~/.cursor/mcp.json` is outside your project, so it won't be committed
- Consider using Cursor's secure credential storage if available

## Summary

### What Was Wrong:
1. ✅ MCP configuration exists but headers are empty
2. ⚠️ May need Service Role Key for full functionality
3. ⚠️ Confusion between MCP "resources" (empty) vs "tools" (available)

### What Was Changed:
1. ✅ Identified existing global MCP config
2. ✅ Provided instructions to add authentication headers
3. ✅ Clarified that Supabase MCP uses tools, not resources

### Next Steps:
1. Add Service Role Key to headers in `~/.cursor/mcp.json`
2. Restart Cursor
3. Test MCP tools in chat
4. Use tools (not resources) to interact with Supabase
