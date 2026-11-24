"""
Chat rules (Module 10): who may message whom, the inbox and conversations.
Messages are pushed live by the ChatMessage signal in realtime.py.
"""
from django.db.models import Count, Max, Q

from .models import ChatMessage, Order, User


def can_chat(me: User, other: User) -> bool:
    """
    Buyers and farmers message each other freely (business rule 20); drivers only with the
    buyers on their own trips; admins with anyone. Farmers never message other farmers.
    """
    if me.pk == other.pk or not other.is_active:
        return False
    if 'admin' in (me.role, other.role):
        return True
    if {me.role, other.role} == {'buyer', 'farmer'}:
        return True
    if {me.role, other.role} == {'buyer', 'driver'}:
        driver, buyer = (me, other) if me.role == 'driver' else (other, me)
        return Order.objects.filter(buyer=buyer, trip__driver=driver).exclude(trip__status='cancelled').exists()
    return False


def conversation(me: User, other: User):
    return ChatMessage.objects.filter(
        Q(sender=me, receiver=other) | Q(sender=other, receiver=me)
    ).select_related('sender').order_by('timestamp')


def mark_conversation_read(me: User, other: User) -> int:
    return ChatMessage.objects.filter(sender=other, receiver=me, is_read=False).update(is_read=True)


def inbox(me: User) -> list[dict]:
    """One row per person I've talked to: last message and my unread count, newest first."""
    mine = ChatMessage.objects.filter(Q(sender=me) | Q(receiver=me))
    rows = {}
    for row in mine.filter(sender=me).values('receiver').annotate(last=Max('id')):
        rows[row['receiver']] = row['last']
    for row in mine.filter(receiver=me).values('sender').annotate(last=Max('id')):
        rows[row['sender']] = max(rows.get(row['sender'], 0), row['last'])
    unread = dict(
        mine.filter(receiver=me, is_read=False).values('sender').annotate(n=Count('id')).values_list('sender', 'n')
    )
    last = {m.id: m for m in ChatMessage.objects.filter(id__in=rows.values()).select_related('sender')}
    partners = {u.pk: u for u in User.objects.filter(pk__in=rows.keys())}
    items = [
        {'partner': partners[pid], 'last_message': last[mid], 'unread': unread.get(pid, 0)}
        for pid, mid in rows.items() if pid in partners and mid in last
    ]
    items.sort(key=lambda item: item['last_message'].timestamp, reverse=True)
    return items[:100]
