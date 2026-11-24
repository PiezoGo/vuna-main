"""
Who hears about what (Module 10). Each function is called at one moment in the order flow
and writes bell items through notifications.notify(). Badge counts update on their own
(realtime signals), so these only cover the bell.
"""
from .models import Checkout, Order, Problem, Trip, User
from .notifications import describe, notify, notify_admins, order_link


def _ksh(amount) -> str:
    return f'KSh {amount:,.2f}'


def _phone(number: str) -> str:
    return f'0{number[3:6]} {number[6:9]} {number[9:]}' if number and len(number) == 12 else (number or '')


def order_placed(order: Order) -> None:
    title = f'New order: {describe(order)}'
    body = f'From {order.buyer.full_name}. Accept or decline within 2 hours.'
    notify(order.farmer, 'order_new', title, body, order_link(order.farmer, order))
    if order.farmer.agent_id:
        agent = order.farmer.agent
        notify(agent, 'order_new', f'{order.farmer.full_name}: {title}', body, order_link(agent, order))


def order_answered(order: Order) -> None:
    buyer = order.buyer
    if order.status in ('accepted', 'paid'):
        body = 'Pay now to confirm it.' if order.status == 'accepted' else "It's paid; we'll plan the delivery."
        notify(buyer, 'order_accepted', f'{order.farmer.full_name} accepted {describe(order)}', body, order_link(buyer, order))
    elif order.status == 'declined':
        body = 'Your money for it will be refunded.' if order.is_paid else 'You won\'t be charged for it.'
        notify(buyer, 'order_declined', f"{order.farmer.full_name} can't supply {describe(order)}", body, order_link(buyer, order))


def order_expired(order: Order) -> None:
    body = 'The farmer didn\'t answer in time.' if order.decided_at is None or not order.is_paid else ''
    notify(order.buyer, 'order_expired', f'Order closed: {describe(order)}', body, order_link(order.buyer, order))


def line_paid(order: Order) -> None:
    """The buyer paid for a line the farmer had already accepted."""
    notify(order.farmer, 'order_paid', f'Paid: {describe(order)}', f'{order.buyer.full_name} has paid. VUNA will collect it.',
           order_link(order.farmer, order))


def payment_received(checkout: Checkout, amount) -> None:
    notify(checkout.buyer, 'payment', f'Payment received: {_ksh(amount)}', f'Order #{checkout.id}', f'/orders/{checkout.id}')


def trip_assigned(trip: Trip, orders: list[Order]) -> None:
    driver = trip.driver
    notify(driver, 'trip_new', f'New trip on {trip.delivery_date:%a %d %b}',
           f'{len(orders)} order{"s" if len(orders) != 1 else ""} to collect and deliver.', '/driver')
    for order in orders:
        notify(order.buyer, 'driver_assigned', f'Your driver for {describe(order)}: {driver.full_name}',
               f'Call {_phone(driver.phone_number)} or chat on the order page. Delivery {trip.delivery_date:%a %d %b}.',
               order_link(order.buyer, order))


def trip_changed(trip: Trip, cancelled: bool = False) -> None:
    title = f'Trip on {trip.delivery_date:%a %d %b} ' + ('cancelled' if cancelled else 'changed')
    notify(trip.driver, 'trip_changed', title, 'Check your stops.', '/driver')


def collected(order: Order) -> None:
    notify(order.farmer, 'collected', f'Collected: {describe(order)}', 'Your payout is due within 4 hours.', order_link(order.farmer, order))
    notify(order.buyer, 'collected', f'On the way: {describe(order)}', f'{order.trip.driver.full_name if order.trip else "Our driver"} has collected it.',
           order_link(order.buyer, order))


def delivered(order: Order) -> None:
    notify(order.buyer, 'delivered', f'Delivered: {describe(order)}', 'Please confirm you received it, or report a problem.',
           order_link(order.buyer, order))


def payout_sent(order: Order) -> None:
    amount = (order.farmer_earnings or 0) - order.payout_deduction
    body = f'M-Pesa {order.payout_reference}' + (f', less {_ksh(order.payout_deduction)} for refunds' if order.payout_deduction else '')
    notify(order.farmer, 'payout', f'Payout sent: {_ksh(amount)}', body, '/farmer/earnings')


def refund_sent(order: Order) -> None:
    amount = order.refund_amount if order.refund_amount is not None else order.total_price
    notify(order.buyer, 'refund', f'Refund sent: {_ksh(amount)}', f'M-Pesa {order.refund_reference} for {describe(order)}',
           order_link(order.buyer, order))


def problem_reported(problem: Problem) -> None:
    notify_admins('problem', f'Problem reported: {describe(problem.order)}', f'{problem.buyer.full_name}: {problem.get_reason_display()}',
                  '/admin/problems')


def problem_decided(problem: Problem) -> None:
    order = problem.order
    if problem.status == 'refunded':
        title = f'Refund agreed: {_ksh(problem.refund_amount)}'
    else:
        title = 'Problem reviewed: no refund'
    notify(problem.buyer, 'problem_decided', title, problem.admin_note, order_link(problem.buyer, order))
    if problem.farmer_deduction:
        notify(order.farmer, 'deduction', f'{_ksh(problem.farmer_deduction)} will come off your next payout',
               f'Refund for {describe(order)}: {problem.admin_note}', '/farmer/earnings')


def farmer_signed_up(user: User) -> None:
    notify_admins('farmer_signup', f'New farmer: {user.full_name}', 'Waiting for approval.', '/admin/farmers')
