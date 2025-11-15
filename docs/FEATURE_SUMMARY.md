# Server-Side Authentication Feature

**Author**: Leah Martinez  
**Branch**: `feature/server-side-auth`  
**Date**: November 8, 2025  
**Status**: Ready for testing

---

## What This Feature Does

Replaces the current client-side authentication with proper server-side security:

### Before (Current Production)
- Passwords hashed in browser (SHA-256)
- User data stored in localStorage
- Admin changes only saved locally
- No real security layer

### After (This Feature)
- Passwords hashed on server (bcrypt)
- User data in Azure database
- Admin changes persist across all users
- Proper JWT token authentication

---

## What's Included

### Backend API (`api/`)
✅ Complete Azure Functions REST API  
✅ User authentication and management  
✅ bcrypt password hashing  
✅ JWT tokens (24-hour expiration)  
✅ Azure Table Storage integration  
✅ Role-based access control  
✅ CORS configured  

### Documentation
✅ API documentation (`api/README.md`)  
✅ Deployment guide (`docs/DEPLOYMENT_GUIDE_OPTION_A.md`)  
✅ Implementation status tracking  
✅ Git workflow guide  

### Admin Portal Support
✅ All existing features work through API:
- Add/edit/delete users
- Assign roles and sites
- Same UI, secure backend

---

## What's NOT Included (Yet)

❌ Frontend updates to call API  
❌ Local development setup instructions  
❌ Integration tests  
❌ SAS tokens for blob storage  

These will be added in follow-up commits to this branch before merging.

---

## Testing Strategy

### Phase 1: Backend Testing (Can Do Now)
1. Deploy API to Azure
2. Test endpoints with curl/Postman
3. Verify database operations
4. Check JWT token generation

### Phase 2: Integration Testing (After Frontend Update)
1. Update frontend to use API
2. Test locally (API + Frontend)
3. Test admin portal features
4. Verify role-based access

### Phase 3: Production Testing (Before Merge)
1. Deploy to staging environment
2. Full user acceptance testing
3. Load testing
4. Security review

---

## How to Test This Branch

### Option 1: Test Backend Only

```bash
# Switch to feature branch
git checkout feature/server-side-auth

# Deploy API (follow deployment guide)
cd api
npm install
npm run build
# Then deploy to Azure

# Test with curl
curl -X POST https://your-api.azurewebsites.net/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@liftwatch.com","password":"password"}'
```

### Option 2: Wait for Full Integration

I can complete the frontend updates first, then test everything together locally.

### Option 3: Test Locally

```bash
# Terminal 1: Run API
cd api
npm install
npm start

# Terminal 2: Run frontend (current version)
npm run dev

# API available at: http://localhost:7071
# Frontend at: http://localhost:8080
```

---

## Deployment Plan

### Recommended Approach

1. **Deploy Backend First** (45 min)
   - Deploy API to Azure Functions
   - Initialize database
   - Test endpoints independently
   - No impact on current production

2. **Update Frontend** (30 min)
   - Update hooks to use API
   - Test locally
   - Commit to this branch

3. **Integration Test** (30 min)
   - Deploy both together
   - Test full workflow
   - Verify admin portal

4. **Merge to Main** (5 min)
   - Create PR
   - Review changes
   - Merge and tag release

### Alternative: Big Bang Approach

1. Complete ALL changes on branch
2. Test everything locally
3. Deploy everything at once
4. Higher risk but faster

---

## Costs

### Monthly Azure Costs (Additional)

- Azure Functions: ~$10/month
- Table Storage: ~$1/month
- **Total: ~$11/month extra**

Current costs (Static Web App, Blob Storage) remain the same.

---

## Security Improvements

| Feature | Before | After |
|---------|--------|-------|
| Password hashing | Client (SHA-256) | Server (bcrypt) |
| Session management | localStorage | JWT tokens |
| Password in transit | Yes | No |
| Admin validation | Client | Server |
| Audit logging | None | Full trail |
| Token expiration | Never | 24 hours |

---

## Risks & Mitigation

### Risk: Breaking Current System
**Mitigation**: Feature branch allows testing without affecting production

### Risk: Database Migration
**Mitigation**: Start with fresh database, migrate users manually

### Risk: Frontend/Backend Sync Issues
**Mitigation**: Test locally before deploying both

### Risk: Azure Costs
**Mitigation**: Monitor consumption, can stay on free tiers initially

---

## Rollback Plan

If something goes wrong:

1. **Frontend Issues**: 
   - Deploy previous frontend version
   - API still works independently

2. **Backend Issues**:
   - Frontend continues with localStorage
   - Fix and redeploy API

3. **Database Issues**:
   - Reinitialize database
   - Reseed admin user

4. **Complete Rollback**:
   - Merge main back over feature
   - Delete Azure Functions resources
   - ~$11/month savings

---

## Next Steps (Choose One)

### Path A: Deploy Backend Now ⚡
- **Time**: 45 minutes
- **Risk**: Low (independent of frontend)
- **Benefit**: Test backend separately

### Path B: Complete Frontend First 🔨
- **Time**: 30 minutes
- **Risk**: Medium (need local testing)
- **Benefit**: Test full stack locally

### Path C: Full Integration 🚀
- **Time**: 2 hours
- **Risk**: Medium
- **Benefit**: Everything tested together

---

## Questions to Answer

1. **When do you need this live?**
   - ASAP → Deploy backend now
   - 1 week → Complete frontend first
   - No rush → Test thoroughly locally

2. **How comfortable with Azure?**
   - Comfortable → Deploy backend yourself
   - Need help → Follow deployment guide
   - Prefer assistance → I'll guide you

3. **Testing preference?**
   - Backend only → Deploy API, test with curl
   - Full stack local → Update frontend, test locally
   - Staging first → Deploy to test environment

---

## Files Changed

```
api/                                    NEW DIRECTORY
├── src/
│   ├── database/tableStorage.ts        User database operations
│   ├── functions/
│   │   ├── auth.ts                     Login endpoint
│   │   ├── users.ts                    User CRUD
│   │   ├── profile.ts                  Current user profile
│   │   └── initialize.ts               Database setup
│   └── utils/
│       ├── auth.ts                     JWT & bcrypt
│       └── response.ts                 HTTP helpers
├── package.json
├── tsconfig.json
├── host.json
└── README.md

docs/
├── DEPLOYMENT_GUIDE_OPTION_A.md        How to deploy
└── README.md                           Updated index

IMPLEMENTATION_STATUS.md                 What's done/pending
BRANCH_WORKFLOW.md                      Git best practices
FEATURE_SUMMARY.md                      This file
```

---

## Commands Reference

```bash
# View this branch
git checkout feature/server-side-auth

# See what changed
git diff main..feature/server-side-auth

# Test locally
npm run dev          # Frontend
cd api && npm start  # Backend

# Deploy (see deployment guide)
cd api
npm install
npm run build
func azure functionapp publish liftwatch-api
```

---

**Ready to proceed?** Let me know which path you want to take! 🚀

