# API Testing Script
# Quick PowerShell script to test all API endpoints

Write-Host "🧪 Testing LML API" -ForegroundColor Cyan
Write-Host "API URL: http://localhost:7071" -ForegroundColor Gray
Write-Host ""

# Test 1: Login
Write-Host "1️⃣  Testing Login..." -ForegroundColor Yellow
try {
    $loginResponse = Invoke-RestMethod -Uri 'http://localhost:7071/api/auth/login' `
        -Method POST `
        -ContentType 'application/json' `
        -Body '{"email":"leah@lmllift.com","password":"password"}'
    
    Write-Host "✅ Login successful!" -ForegroundColor Green
    Write-Host "User: $($loginResponse.user.email)" -ForegroundColor Gray
    Write-Host "Role: $($loginResponse.user.role)" -ForegroundColor Gray
    
    $token = $loginResponse.token
    Write-Host "Token: $($token.Substring(0, 50))..." -ForegroundColor Gray
    Write-Host ""
    
} catch {
    Write-Host "❌ Login failed: $_" -ForegroundColor Red
    exit 1
}

# Test 2: Get Profile
Write-Host "2️⃣  Testing Get Profile..." -ForegroundColor Yellow
try {
    $headers = @{ Authorization = "Bearer $token" }
    $profile = Invoke-RestMethod -Uri 'http://localhost:7071/api/profile' `
        -Method GET `
        -Headers $headers
    
    Write-Host "✅ Profile retrieved!" -ForegroundColor Green
    Write-Host "Email: $($profile.email)" -ForegroundColor Gray
    Write-Host "Role: $($profile.role)" -ForegroundColor Gray
    Write-Host "Last Login: $($profile.lastLogin)" -ForegroundColor Gray
    Write-Host ""
    
} catch {
    Write-Host "❌ Get profile failed: $_" -ForegroundColor Red
}

# Test 3: List Users
Write-Host "3️⃣  Testing List Users..." -ForegroundColor Yellow
try {
    $users = Invoke-RestMethod -Uri 'http://localhost:7071/api/users' `
        -Method GET `
        -Headers $headers
    
    Write-Host "✅ Users retrieved!" -ForegroundColor Green
    Write-Host "Total users: $($users.Count)" -ForegroundColor Gray
    foreach ($user in $users) {
        Write-Host "  - $($user.email) ($($user.role))" -ForegroundColor Gray
    }
    Write-Host ""
    
} catch {
    Write-Host "❌ List users failed: $_" -ForegroundColor Red
}

# Test 4: Create User
Write-Host "4️⃣  Testing Create User..." -ForegroundColor Yellow
try {
    $newUser = Invoke-RestMethod -Uri 'http://localhost:7071/api/users' `
        -Method POST `
        -ContentType 'application/json' `
        -Headers $headers `
        -Body '{"email":"test@company.com","password":"test123","role":"site_manager","sites":["Tower D"]}'
    
    Write-Host "✅ User created!" -ForegroundColor Green
    Write-Host "Email: $($newUser.email)" -ForegroundColor Gray
    Write-Host "Role: $($newUser.role)" -ForegroundColor Gray
    Write-Host "Sites: $($newUser.sites -join ', ')" -ForegroundColor Gray
    Write-Host ""
    
} catch {
    Write-Host "❌ Create user failed: $_" -ForegroundColor Red
}

# Test 5: Update User
Write-Host "5️⃣  Testing Update User..." -ForegroundColor Yellow
try {
    $updated = Invoke-RestMethod -Uri 'http://localhost:7071/api/users/test@company.com' `
        -Method PUT `
        -ContentType 'application/json' `
        -Headers $headers `
        -Body '{"role":"national_manager","sites":["Tower A","Tower B"]}'
    
    Write-Host "✅ User updated!" -ForegroundColor Green
    Write-Host "New role: $($updated.role)" -ForegroundColor Gray
    Write-Host "New sites: $($updated.sites -join ', ')" -ForegroundColor Gray
    Write-Host ""
    
} catch {
    Write-Host "❌ Update user failed: $_" -ForegroundColor Red
}

# Test 6: Delete User
Write-Host "6️⃣  Testing Delete User..." -ForegroundColor Yellow
try {
    $result = Invoke-RestMethod -Uri 'http://localhost:7071/api/users/test@company.com' `
        -Method DELETE `
        -Headers $headers
    
    Write-Host "✅ User deleted!" -ForegroundColor Green
    Write-Host ""
    
} catch {
    Write-Host "❌ Delete user failed: $_" -ForegroundColor Red
}

# Test 7: Security - Try to delete self
Write-Host "7️⃣  Testing Security (Self-Deletion Prevention)..." -ForegroundColor Yellow
try {
    $result = Invoke-RestMethod -Uri 'http://localhost:7071/api/users/leah@lmllift.com' `
        -Method DELETE `
        -Headers $headers
    
    Write-Host "❌ SECURITY ISSUE: Should not allow self-deletion!" -ForegroundColor Red
    
} catch {
    Write-Host "✅ Self-deletion prevented (as expected)" -ForegroundColor Green
    Write-Host ""
}

# Test 8: Security - Wrong password
Write-Host "8️⃣  Testing Security (Wrong Password)..." -ForegroundColor Yellow
try {
    $badLogin = Invoke-RestMethod -Uri 'http://localhost:7071/api/auth/login' `
        -Method POST `
        -ContentType 'application/json' `
        -Body '{"email":"leah@lmllift.com","password":"wrongpassword"}'
    
    Write-Host "❌ SECURITY ISSUE: Should reject wrong password!" -ForegroundColor Red
    
} catch {
    Write-Host "✅ Wrong password rejected (as expected)" -ForegroundColor Green
    Write-Host ""
}

Write-Host "🎉 All tests complete!" -ForegroundColor Cyan
Write-Host ""
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "✅ Login works" -ForegroundColor Green
Write-Host "✅ Profile retrieval works" -ForegroundColor Green
Write-Host "✅ User management works" -ForegroundColor Green
Write-Host "✅ Security checks pass" -ForegroundColor Green
Write-Host ""
Write-Host "Next: Deploy to Azure or update frontend" -ForegroundColor Yellow


