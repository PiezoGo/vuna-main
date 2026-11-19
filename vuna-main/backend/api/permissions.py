from rest_framework import permissions


class _RolePermission(permissions.BasePermission):
    role = None
    message = 'You do not have permission to perform this action.'

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and user.role == self.role)


class IsAdmin(_RolePermission):
    role = 'admin'
    message = 'Only admins can perform this action.'


class IsDriver(_RolePermission):
    role = 'driver'
    message = 'Only drivers can perform this action.'


class IsFarmer(_RolePermission):
    role = 'farmer'
    message = 'Only farmers can perform this action.'


class IsBuyer(_RolePermission):
    role = 'buyer'
    message = 'Only buyers can place orders.'


class IsProductOwnerOrAdmin(permissions.BasePermission):
    """Object-level: the farmer who owns the product, or any admin."""

    message = 'You can only change your own products.'

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and user.role in ('farmer', 'admin'))

    def has_object_permission(self, request, view, obj):
        return request.user.role == 'admin' or obj.farmer_id == request.user.pk
