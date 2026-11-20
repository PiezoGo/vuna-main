"""Account management: password changes, one-time passwords, farmer approval, cooperatives."""
import secrets
import uuid

from django.db.models import Count, Q
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema, inline_serializer
from rest_framework import permissions, serializers, status
from rest_framework.authtoken.models import Token
from rest_framework.generics import ListAPIView
from rest_framework.response import Response
from rest_framework.views import APIView

from . import schema
from .models import Cooperative, User
from .permissions import IsAdmin
from .serializers import (
    ChangePasswordSerializer,
    CooperativeSerializer,
    FarmerApprovalSerializer,
    RejectFarmerSerializer,
    StaffCreateSerializer,
    UserSerializer,
)

# No 0/O, 1/l/I: one-time passwords are read aloud or copied by hand.
_OTP_ALPHABET = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'


def generate_one_time_password(length: int = 10) -> str:
    return ''.join(secrets.choice(_OTP_ALPHABET) for _ in range(length))


def issue_one_time_password(user: User) -> str:
    """Set a fresh one-time password; the user must replace it at next sign-in."""
    password = generate_one_time_password()
    user.set_password(password)
    user.must_change_password = True
    user.save(update_fields=['password', 'must_change_password'])
    return password


StaffCredentials = inline_serializer('StaffCredentials', {
    'user': UserSerializer(),
    'login_email': serializers.EmailField(),
    'one_time_password': serializers.CharField(help_text='Shown once. Give it to the person; it is not stored readably.'),
})


class ChangePasswordView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(request=ChangePasswordSerializer, responses={200: UserSerializer, 400: OpenApiTypes.OBJECT})
    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = request.user
        user.set_password(serializer.validated_data['new_password'])
        user.must_change_password = False
        user.save(update_fields=['password', 'must_change_password'])
        return Response(UserSerializer(user).data)


class CooperativeListView(ListAPIView):
    """Public list of cooperatives for the farmer sign-up form."""
    permission_classes = [permissions.AllowAny]
    serializer_class = CooperativeSerializer
    pagination_class = None
    queryset = Cooperative.objects.filter(is_active=True)


class AdminStaffCreateView(APIView):
    """Admin creates a driver or field agent and receives their one-time password once."""
    permission_classes = [IsAdmin]

    @extend_schema(request=StaffCreateSerializer, responses={201: StaffCredentials, 400: OpenApiTypes.OBJECT})
    def post(self, request):
        serializer = StaffCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        email = data.get('email') or f"{data['role']}_{uuid.uuid4().hex[:8]}@vuna.co.ke"
        user = User.objects.create_user(
            email=email,
            username=email,
            password=None,
            full_name=data['full_name'],
            role=data['role'],
            phone_number=data['phone_number'],
            vehicle_type=data.get('vehicle_type', ''),
            is_driver_active=data['role'] == 'driver',
        )
        password = issue_one_time_password(user)
        return Response(
            {'user': UserSerializer(user).data, 'login_email': email, 'one_time_password': password},
            status=status.HTTP_201_CREATED,
        )


class AdminResetPasswordView(APIView):
    """Admin issues a new one-time password (the 'forgot password' path until SMS reset exists)."""
    permission_classes = [IsAdmin]

    @extend_schema(request=None, responses={200: StaffCredentials, 400: schema.ErrorResponse, 404: schema.ErrorResponse})
    def post(self, request, uid):
        user = User.objects.filter(uid=uid).first()
        if user is None:
            return Response({'error': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)
        if user.role == 'admin':
            return Response({'error': 'Admin passwords cannot be reset here.'}, status=status.HTTP_400_BAD_REQUEST)
        password = issue_one_time_password(user)
        # Sign the user out everywhere: their old token stops working.
        Token.objects.filter(user=user).delete()
        return Response({'user': UserSerializer(user).data, 'login_email': user.email, 'one_time_password': password})


class AdminFarmerListView(ListAPIView):
    permission_classes = [IsAdmin]
    serializer_class = FarmerApprovalSerializer
    pagination_class = None

    @extend_schema(parameters=[OpenApiParameter('status', str, enum=['pending', 'approved', 'rejected'])])
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    def get_queryset(self):
        queryset = (
            User.objects.filter(role='farmer')
            .select_related('cooperative')
            .annotate(listings=Count('products', filter=Q(products__is_active=True)))
            .order_by('date_joined')
        )
        wanted = self.request.query_params.get('status')
        if wanted in ('pending', 'approved', 'rejected'):
            queryset = queryset.filter(approval_status=wanted)
        return queryset


class AdminFarmerApproveView(APIView):
    permission_classes = [IsAdmin]

    @extend_schema(request=None, responses={200: FarmerApprovalSerializer, 404: schema.ErrorResponse})
    def post(self, request, uid):
        farmer = User.objects.filter(uid=uid, role='farmer').first()
        if farmer is None:
            return Response({'error': 'Farmer not found.'}, status=status.HTTP_404_NOT_FOUND)
        farmer.approval_status = 'approved'
        farmer.rejection_reason = ''
        farmer.save(update_fields=['approval_status', 'rejection_reason'])
        farmer.listings = farmer.products.filter(is_active=True).count()
        return Response(FarmerApprovalSerializer(farmer).data)


class AdminFarmerRejectView(APIView):
    permission_classes = [IsAdmin]

    @extend_schema(request=RejectFarmerSerializer, responses={200: FarmerApprovalSerializer, 404: schema.ErrorResponse})
    def post(self, request, uid):
        farmer = User.objects.filter(uid=uid, role='farmer').first()
        if farmer is None:
            return Response({'error': 'Farmer not found.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = RejectFarmerSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        farmer.approval_status = 'rejected'
        farmer.rejection_reason = serializer.validated_data['reason']
        farmer.save(update_fields=['approval_status', 'rejection_reason'])
        farmer.listings = farmer.products.filter(is_active=True).count()
        return Response(FarmerApprovalSerializer(farmer).data)
