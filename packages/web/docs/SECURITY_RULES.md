# Firebase Security Rules

## Overview
This document explains the security rules implemented for Vedida Farms.

## Firestore Rules

### Users Collection
- **Read**: Users can read own profile, admins can read all
- **Create**: Users can create own profile (role: customer only)
- **Update**: Users can update own profile (cannot change role), admins can update any
- **Delete**: Not allowed (use soft delete)

### Products Collection
- **Read**: Public (anyone can view products)
- **Write**: Admin only

### Carts Collection
- **Read/Write**: Users can only access own cart
- **Read**: Admins can read any cart

### Orders Collection
- **Read**: Users can read own orders, admins can read all
- **Create**: Users can create orders for themselves (status: pending)
- **Update**: Admin only
- **Delete**: Not allowed

### Subscriptions Collection
- **Read**: Users can read own subscriptions, admins can read all
- **Create**: Users can create subscriptions (status: pending)
- **Update**: Users can update own (limited fields), admins can update any
- **Delete**: Not allowed

### Settings Collection
- **Read**: Public (for app functionality)
- **Write**: Admin only

## Storage Rules

### Product Images (`/products/{productId}_{timestamp}.{ext}`)
- **Read**: Public
- **Write**: Admin only
- **Validation**: Image type, max 5MB

### User Images (`/users/{userId}/*`)
- **Read**: Owner or admin
- **Write**: Owner or admin
- **Validation**: Image type, max 5MB

## Testing Rules

Use Firebase Emulator to test rules locally before deploying to production.

## Security Best Practices

1. Always validate user input on client side
2. Never trust client-side validation alone
3. Use Firestore rules as the final security layer
4. Regularly audit rules for vulnerabilities
5. Monitor Firebase Console for suspicious activity