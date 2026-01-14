# Database Seed Scripts

Scripts for seeding initial data into the database.

## Seed Users

Creates default admin and user accounts for testing and development.

### Usage

```bash
# Create users (skips if they already exist)
npm run seed:users

# Reset passwords for existing users
npm run seed:users:reset
```

### Created Users

1. **Admin User**
   - Email: `admin@test.com`
   - Password: `Admin123!`
   - Role: `ADMIN`
   - Status: `ACTIVE`

2. **Regular User**
   - Email: `user@test.com`
   - Password: `User123!`
   - Role: `USER`
   - Status: `ACTIVE`

### Notes

- Script checks if users already exist before creating
- Passwords are automatically hashed using bcrypt
- Users are created with ACTIVE status (can login immediately)
- Set `RESET_PASSWORDS=true` environment variable to update existing users

