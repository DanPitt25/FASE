# Seat Control Implementation Guide

## Overview

Seat control is essential for FASE's business model, ensuring that corporate memberships are used by the intended number of users and preventing credential sharing. This is particularly important for premium features like the Knowledge Base and Webinar access.

## Business Requirements

### Core Principles
1. **Individual Memberships**: Always 1 seat, no sharing needed
2. **Corporate Memberships**: Multiple seats based on tier/payment
3. **Enforcement**: Prevent simultaneous access from multiple locations
4. **Audit Trail**: Track usage for compliance and billing

### Key Features to Protect
- Knowledge Base access
- Live webinar attendance
- Webinar recordings
- Member directory access
- Premium content downloads

## Technical Implementation Strategy

### 1. Database Structure

```typescript
// Enhanced accounts collection
{
  membershipType: 'corporate',
  organizationName: 'Example Corp',
  
  // Seat configuration
  seats: {
    limit: 10,              // Maximum allowed seats
    active: 3,              // Currently active seats
    tier: 'standard',       // Pricing tier
    enforcement: 'strict'   // 'strict' | 'flexible' | 'monitor'
  },
  
  // Feature access
  features: {
    knowledgeBase: true,
    webinars: true,
    directory: true,
    downloads: 50  // Monthly limit
  }
}

// Enhanced members subcollection
{
  firebaseUid: 'abc123',
  email: 'user@example.com',
  
  // Seat status
  seat: {
    status: 'active',       // 'active' | 'invited' | 'suspended'
    activatedAt: timestamp,
    lastActiveAt: timestamp,
    sessionId: 'uuid-v4',   // Current active session
    deviceFingerprint: 'hash'
  },
  
  // Usage tracking
  usage: {
    lastWebinarAccess: timestamp,
    lastKnowledgeBaseAccess: timestamp,
    monthlyDownloads: 5
  }
}
```

### 2. Session Management

```typescript
// lib/seat-control.ts
export class SeatController {
  // Create session when user accesses protected content
  async createSession(userId: string, deviceInfo: DeviceInfo) {
    const member = await getUnifiedMember(userId);
    
    // Check if user already has active session elsewhere
    const existingSession = await this.getActiveSession(userId);
    if (existingSession && existingSession.deviceFingerprint !== deviceInfo.fingerprint) {
      throw new SeatConflictError('Active session detected on another device');
    }
    
    // Create new session
    const sessionId = generateUUID();
    await updateMemberSeat(userId, {
      sessionId,
      deviceFingerprint: deviceInfo.fingerprint,
      lastActiveAt: serverTimestamp()
    });
    
    return sessionId;
  }
  
  // Heartbeat to maintain session
  async heartbeat(userId: string, sessionId: string) {
    const member = await getUnifiedMember(userId);
    
    if (member.seat.sessionId !== sessionId) {
      throw new InvalidSessionError('Session expired or taken over');
    }
    
    await updateMemberSeat(userId, {
      lastActiveAt: serverTimestamp()
    });
  }
  
  // Clean up stale sessions (run periodically)
  async cleanupStaleSessions() {
    const staleTimeout = 30 * 60 * 1000; // 30 minutes
    const staleSessions = await getStaleMembers(staleTimeout);
    
    for (const member of staleSessions) {
      await updateMemberSeat(member.id, {
        sessionId: null,
        status: 'idle'
      });
    }
  }
}
```

### 3. Client-Side Implementation

```typescript
// hooks/useSeatControl.ts
export const useSeatControl = () => {
  const { user, member } = useUnifiedAuth();
  const [session, setSession] = useState<Session | null>(null);
  const [conflictError, setConflictError] = useState(false);
  
  useEffect(() => {
    if (!user || !member) return;
    
    // Initialize session
    const initSession = async () => {
      try {
        const deviceInfo = await getDeviceFingerprint();
        const sessionId = await createSession(user.uid, deviceInfo);
        setSession({ id: sessionId, active: true });
        
        // Start heartbeat
        const heartbeatInterval = setInterval(() => {
          heartbeat(user.uid, sessionId).catch(() => {
            setConflictError(true);
            clearInterval(heartbeatInterval);
          });
        }, 5 * 60 * 1000); // Every 5 minutes
        
        return () => clearInterval(heartbeatInterval);
      } catch (error) {
        if (error instanceof SeatConflictError) {
          setConflictError(true);
        }
      }
    };
    
    initSession();
  }, [user, member]);
  
  return { session, conflictError };
};

// components/ProtectedKnowledgeBase.tsx
export const ProtectedKnowledgeBase = ({ children }) => {
  const { session, conflictError } = useSeatControl();
  
  if (conflictError) {
    return (
      <SeatConflictModal
        message="You're already accessing FASE from another device"
        onTakeOver={() => window.location.reload()}
        onCancel={() => router.push('/member-portal')}
      />
    );
  }
  
  if (!session?.active) {
    return <LoadingSpinner />;
  }
  
  return children;
};
```

### 4. Middleware Protection

```typescript
// middleware.ts
export async function middleware(request: NextRequest) {
  const protectedPaths = ['/knowledge-base-webinars', '/api/knowledge-base'];
  
  if (protectedPaths.some(path => request.nextUrl.pathname.startsWith(path))) {
    const token = await getToken({ req: request });
    if (!token) return NextResponse.redirect(new URL('/login', request.url));
    
    // Verify session
    const sessionId = request.headers.get('x-session-id');
    if (!sessionId) {
      return NextResponse.json({ error: 'No session' }, { status: 401 });
    }
    
    const isValidSession = await verifySession(token.sub, sessionId);
    if (!isValidSession) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 403 });
    }
  }
}
```

### 5. Admin Management Interface

```typescript
// app/admin-portal/seat-management.tsx
export const SeatManagement = ({ organization }) => {
  const [members, setMembers] = useState([]);
  
  const suspendSeat = async (memberId: string) => {
    await updateMemberSeat(memberId, {
      status: 'suspended',
      sessionId: null
    });
    // Force logout
    await revokeAllSessions(memberId);
  };
  
  const upgradeSeatLimit = async (newLimit: number) => {
    await updateOrganizationSeats(organization.id, {
      limit: newLimit
    });
  };
  
  return (
    <div>
      <SeatUsageChart 
        used={organization.seats.active} 
        total={organization.seats.limit} 
      />
      
      <MembersList 
        members={members}
        onSuspend={suspendSeat}
        onActivate={activateSeat}
      />
      
      <UpgradePrompt 
        currentTier={organization.seats.tier}
        onUpgrade={upgradeSeatLimit}
      />
    </div>
  );
};
```

## Implementation Phases

### Phase 1: Basic Seat Tracking (1-2 weeks)
- Add seat fields to database
- Track active seats on login
- Basic admin UI to view seat usage

### Phase 2: Session Management (2-3 weeks)
- Implement device fingerprinting
- Session creation and heartbeat
- Handle conflicts gracefully

### Phase 3: Enforcement (1-2 weeks)
- Middleware protection
- Client-side enforcement
- Automated cleanup

### Phase 4: Advanced Features (2-3 weeks)
- Usage analytics
- Seat assignment by admin
- Bulk seat management
- Export usage reports

## Security Considerations

1. **Device Fingerprinting**: Use combination of:
   - User agent
   - Screen resolution
   - Timezone
   - Canvas fingerprint
   - WebGL renderer

2. **Session Security**:
   - Use cryptographically secure session IDs
   - Implement CSRF protection
   - Rate limit heartbeat endpoints

3. **Privacy Compliance**:
   - Store minimal device information
   - Allow users to see their active sessions
   - Provide session management in user settings

## Monitoring and Analytics

Track key metrics:
- Concurrent sessions per organization
- Seat utilization rate
- Conflict frequency
- Feature usage per seat

## Alternative Approaches

### 1. **IP-Based Restriction**
- Simpler but less accurate
- Problems with VPNs and shared offices

### 2. **Time-Based Access**
- Allow X hours per month per seat
- Good for content consumption

### 3. **Credit System**
- Each action consumes credits
- More flexible but complex

## Recommended Approach

Start with **Phase 1** for immediate visibility, then implement **Phase 2** for actual enforcement. This provides:

1. Quick wins with usage tracking
2. Time to educate users about seat limits
3. Gradual enforcement to minimize disruption
4. Data to inform pricing decisions

The session-based approach with device fingerprinting provides the best balance of security and user experience.