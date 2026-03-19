# WebSocket Real-Time Sync

Native `ws` WebSocket server enables multi-user real-time editing across all spreadsheet views.

---

## Server Setup

**Library**: `ws` (native WebSocket, not Socket.IO)
**Path**: `/ws`
**Auth**: Session cookie verification on connection

### Connection Authentication
```
1. Client connects to ws://host/ws
2. verifyClient callback reads muros_session cookie
3. Validates session against DB
4. Rejects with 401 if invalid
5. Accepts authenticated connections
```

---

## Message Protocol

### Format
```json
{
  "type": "typology" | "developer" | "development" | "client" | "notification",
  "action": "create" | "update" | "delete",
  "data": { /* entity data */ }
}
```

### Broadcast Functions (server-side)
| Function | Triggered By |
|----------|-------------|
| `broadcastTypologyUpdate(action, data)` | Typology CRUD operations |
| `broadcastDeveloperUpdate(action, data)` | Developer CRUD operations |
| `broadcastDevelopmentUpdate(action, data)` | Development CRUD operations |
| `broadcastClientUpdate(action, data)` | Client/prospect CRUD operations |
| `broadcastNotification(action, data)` | Duplicate phone/email detection |

All broadcasts send to **every connected client** (no room/channel filtering).

> **Note**: All 4 entity spreadsheets (including developments) have WebSocket listeners. An earlier audit incorrectly flagged developments as missing WebSocket support -- this was already implemented.

---

## Client Integration

### Connection Setup (per spreadsheet component)
```typescript
useEffect(() => {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);

  ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.type === "typology") {
      queryClient.invalidateQueries({ queryKey: ['/api/typologies'] });
    }
  };

  return () => ws.close();
}, []);
```

### Query Invalidation Map
| WebSocket type | Invalidated query key |
|---------------|----------------------|
| `typology` | `['/api/typologies']` |
| `developer` | `['/api/developers']` |
| `development` | `['/api/developments-entity']` |
| `client` | `['/api/clients']` |
| `notification` | `['/api/notifications']` |

---

## Data Flow

```
User A                    Server                    User B
  │                         │                         │
  ├─ PUT /api/typologies/1 ─►                         │
  │                         ├─ Save to DB             │
  │                         ├─ Respond 200 ──────────►│
  │                         │                         │
  │                         ├─ broadcastTypologyUpdate │
  │                         │  to all WS clients      │
  │                         │                         │
  │  ◄── WS message ───────┤────── WS message ──────►│
  │                         │                         │
  ├─ invalidateQueries      │      invalidateQueries ─┤
  ├─ GET /api/typologies ──►│  ◄── GET /api/typologies┤
  │                         │                         │
  ├─ UI re-renders          │           UI re-renders ─┤
```

---

## Notification WebSocket

### Duplicate Detection Flow
```
1. User creates/updates client with phone/email
2. Server checks findDuplicateClients(phone, email)
3. If duplicates found:
   a. Creates notification records for all admin users
   b. Broadcasts: { type: "notification", action: "create", data: {...} }
4. notification-bell.tsx receives message
5. Invalidates ['/api/notifications'] query
6. Bell icon shows unread count
```

### Fallback Polling
`notification-bell.tsx` has a 30-second polling interval as fallback when WebSocket is unavailable:
```typescript
useQuery({
  queryKey: ['/api/notifications'],
  refetchInterval: 30000, // 30s fallback
});
```

---

## Connection Lifecycle

| Event | Behavior |
|-------|----------|
| Connect | Cookie verified, connection accepted/rejected |
| Message | Parsed, dispatched to query invalidation |
| Disconnect | Connection cleaned up |
| Reconnect | Auto-reconnect (browser WebSocket default) |
| Server restart | All connections dropped, clients reconnect |

---

## Limitations

- **No rooms/channels**: All messages broadcast to all clients. Filtering is client-side.
- **No message acknowledgment**: Fire-and-forget broadcasts.
- **No offline queue**: Messages missed during disconnect are lost (mitigated by query re-fetch on reconnect).
- **No conflict resolution**: Last-write-wins. Two users editing the same cell simultaneously — last save wins.
- **Single server**: WebSocket state is in-memory. Would need Redis pub/sub for multi-server scaling.
