import requests
import sys
import random

BASE_URL = 'http://localhost:8000/api/'

def test_flow():
    print("Starting integration test flow for Vuna...")
    
    # 1. Clean up database / recreate test users if they exist
    rand_id = random.randint(1000, 9999)
    farmer_email = f"farmer_{rand_id}@vuna.com"
    buyer_email = f"buyer_{rand_id}@vuna.com"
    password = "Password123"

    print(f"\n--- 1. Registering Farmer ({farmer_email}) ---")
    farmer_data = {
        "email": farmer_email,
        "password": password,
        "full_name": "Francisco Farmer",
        "phone_number": "0712345678",
        "role": "farmer",
        "country": "Kenya",
        "city": "Eldoret",
        "market": "Eldoret Open Market"
    }
    r = requests.post(BASE_URL + 'register/', json=farmer_data)
    assert r.status_code == 201, f"Farmer registration failed: {r.text}"
    farmer_token = r.json()['token']
    farmer_uid = r.json()['user']['uid']
    print(f"Success! Farmer registered. Token: {farmer_token[:10]}...")

    print(f"\n--- 2. Farmer Lists New Product ---")
    headers_farmer = {"Authorization": f"Token {farmer_token}"}
    product_data = {
        "title": "Sweet Potatoes",
        "commodity": "Tubers",
        "unit": "sack",
        "price_per_unit": 1200,
        "quantity": 50,
        "delivery_time_varies": False,
        "delivery_time_manual": 2
    }
    r = requests.post(BASE_URL + 'products/', data=product_data, headers=headers_farmer)
    assert r.status_code == 201, f"Listing product failed: {r.text}"
    product_json = r.json()
    product_id = product_json['id']
    print(f"Success! Listed product ID: {product_id}, title: {product_json['title']}")
    print(f"Product Detail: {product_json}")

    print(f"\n--- 3. Registering Buyer ({buyer_email}) ---")
    buyer_data = {
        "email": buyer_email,
        "password": password,
        "full_name": "Beatrice Buyer",
        "phone_number": "0722345678",
        "role": "buyer",
        "country": "Kenya",
        "city": "Nairobi",
        "market": "Wakulima"
    }
    r = requests.post(BASE_URL + 'register/', json=buyer_data)
    assert r.status_code == 201, f"Buyer registration failed: {r.text}"
    buyer_token = r.json()['token']
    buyer_uid = r.json()['user']['uid']
    print(f"Success! Buyer registered. Token: {buyer_token[:10]}...")

    print(f"\n--- 4. Buyer Browses Marketplace ---")
    headers_buyer = {"Authorization": f"Token {buyer_token}"}
    r = requests.get(BASE_URL + 'products/', headers=headers_buyer)
    assert r.status_code == 200, f"Fetching products failed: {r.text}"
    products = r.json()
    print(f"Raw products list from GET: {products}")
    assert len(products) >= 1, "No products found in marketplace!"
    found_product = next((p for p in products if p['id'] == product_id), None)
    assert found_product is not None, "Sweet Potatoes product not found in feed!"
    print(f"Success! Found product in feed. Price: {found_product['price_per_unit']} KES")

    print(f"\n--- 5. Buyer Places Order for 5 Sacks ---")
    order_data = {
        "product": product_id,
        "quantity": 5
    }
    r = requests.post(BASE_URL + 'orders/', json=order_data, headers=headers_buyer)
    assert r.status_code == 201, f"Placing order failed: {r.text}"
    order = r.json()
    order_id = order['id']
    assert order['status'] == 'pending', f"Unexpected initial status: {order['status']}"
    assert float(order['total_price']) == 6000.0, f"Expected total price to be 6000.0, got: {order['total_price']}"
    print(f"Success! Order placed. Order ID: {order_id}, Total: {order['total_price']} KES, Status: {order['status']}")

    print(f"\n--- 6. Buyer Starts Chat with Farmer ---")
    msg_data = {
        "receiver_id": farmer_uid,
        "message": "Hello Francisco! Is it possible to deliver tomorrow?"
    }
    r = requests.post(BASE_URL + 'messages/', json=msg_data, headers=headers_buyer)
    assert r.status_code == 201, f"Sending chat message failed: {r.text}"
    print(f"Success! Buyer sent chat message: '{msg_data['message']}'")

    print(f"\n--- 7. Farmer Fetches Chats and Replies ---")
    r = requests.get(BASE_URL + 'messages/chats/', headers=headers_farmer)
    assert r.status_code == 200, f"Farmer fetching chat inbox failed: {r.text}"
    chats = r.json()
    assert len(chats) >= 1, "Farmer inbox is empty!"
    buyer_chat = next((c for c in chats if c['partner']['uid'] == buyer_uid), None)
    assert buyer_chat is not None, "Buyer not found in farmer's chat list!"
    assert buyer_chat['last_message']['message'] == msg_data['message'], "Last message in inbox is incorrect!"
    
    reply_data = {
        "receiver_id": buyer_uid,
        "message": "Yes Beatrice, that is fine."
    }
    r = requests.post(BASE_URL + 'messages/', json=reply_data, headers=headers_farmer)
    assert r.status_code == 201, f"Farmer sending reply failed: {r.text}"
    print(f"Success! Farmer saw message and replied: '{reply_data['message']}'")

    print(f"\n--- 8. Farmer Marks Order as Delivered ---")
    r = requests.patch(BASE_URL + f'orders/{order_id}/', json={"status": "delivery_in_progress"}, headers=headers_farmer)
    assert r.status_code == 200, f"Farmer starting delivery failed: {r.text}"
    assert r.json()['status'] == 'delivery_in_progress', f"Expected delivery_in_progress, got: {r.json()['status']}"

    r = requests.patch(BASE_URL + f'orders/{order_id}/', json={"status": "delivered"}, headers=headers_farmer)
    assert r.status_code == 200, f"Farmer marking order delivered failed: {r.text}"
    assert r.json()['status'] == 'delivered', f"Expected status delivered, got: {r.json()['status']}"
    print("Success! Farmer marked order as delivered.")

    print(f"\n--- 9. Buyer Confirms Receipt (Completes Order) ---")
    r = requests.patch(BASE_URL + f'orders/{order_id}/', json={"status": "completed"}, headers=headers_buyer)
    assert r.status_code == 200, f"Buyer completing order failed: {r.text}"
    assert r.json()['status'] == 'completed', f"Expected status completed, got: {r.json()['status']}"
    print("Success! Buyer confirmed receipt. Order completed.")

    print(f"\n--- 10. Verify Product Inventory Decremented ---")
    # The listing is archived upon order completion, meaning it becomes is_active=False.
    # Therefore, it should no longer be returned in the public marketplace feed.
    r = requests.get(BASE_URL + 'products/', headers=headers_buyer)
    assert r.status_code == 200, f"Fetching products failed: {r.text}"
    public_products = r.json()
    found_public = next((p for p in public_products if p['id'] == product_id), None)
    assert found_public is None, "Product should NOT be visible in public marketplace feed after order completion!"
    print("Success! Product successfully removed from the public marketplace feed.")

    # The farmer should still see the product in their own listings, but marked as inactive.
    r = requests.get(BASE_URL + 'products/?my_listings=true', headers=headers_farmer)
    assert r.status_code == 200, f"Farmer fetching own products failed: {r.text}"
    farmer_products = r.json()
    found_farmer_prod = next((p for p in farmer_products if p['id'] == product_id), None)
    assert found_farmer_prod is not None, "Product should still exist in farmer's listings!"
    assert found_farmer_prod['is_active'] is False, "Product should be archived (is_active = False)!"
    print("Success! Product validated in farmer's list with is_active = False.")

    print(f"\n--- 11. Verify Farmer Earnings ---")
    r = requests.get(BASE_URL + 'farmer/earnings/', headers=headers_farmer)
    assert r.status_code == 200, f"Fetching earnings failed: {r.text}"
    earnings_data = r.json()
    assert float(earnings_data['total_earnings']) == 6000.0, f"Expected 6000.0, got: {earnings_data['total_earnings']}"
    assert len(earnings_data['completed_orders']) == 1, "Completed order not in earnings list!"
    print(f"Success! Farmer earnings show total: {earnings_data['total_earnings']} KES.")

    print("\n==============================================")
    print("ALL INTEGRATION TESTS PASSED SUCCESSFULLY! 🎉")
    print("==============================================")

if __name__ == '__main__':
    try:
        test_flow()
    except AssertionError as e:
        print(f"\nTEST FAILURE: {e}")
        sys.exit(1)
