export const helpContent = {
  title: "Vuna B2B Agricultural Marketplace Guide",
  description: "Welcome to Vuna! This platform connects Kenyan farmers directly with buyers. Below is an overview of how to navigate the application based on your active role.",
  
  navigationSections: [
    {
      role: "general",
      title: "General Navigation",
      icon: "Compass",
      items: [
        {
          title: "Accessing Pages",
          details: "Use the top navigation bar to access primary actions. The Vuna logo takes you back to your default role dashboard."
        },
        {
          title: "Switching Modes",
          details: "If you registered as both a Farmer and Buyer, you will see a 'Switch to Buyer Mode' or 'Switch to Farmer Mode' button in the top navbar. Click it to switch dashboards instantly."
        },
        {
          title: "Profile Settings",
          details: "Click on the 'Edit Profile' button in the top navbar to edit your profile details like name, email, phone number, location, bio, or avatar."
        }
      ]
    },
    {
      role: "farmer",
      title: "Farmer Dashboard Features",
      icon: "Sprout",
      items: [
        {
          title: "Active Listings Tab",
          details: "View your current farm listings. Click 'List Product' in the top right to add a new crop/commodity, set pricing (KES/unit), quantity, upload up to 3 images, and specify delivery times."
        },
        {
          title: "Orders Tab",
          details: "Track pending orders placed by buyers. When you ship or prepare the goods, click 'Mark Delivered'. Once the buyer confirms receipt, the sale completes."
        },
        {
          title: "Inbox Tab",
          details: "Chat directly with interested buyers to discuss bulk pricing, packaging, or collection arrangements."
        },
        {
          title: "Earnings Estimator (Calculator)",
          details: "Select one of your listed commodities and input an estimated quantity to project your potential revenue instantly."
        }
      ]
    },
    {
      role: "buyer",
      title: "Buyer Marketplace Features",
      icon: "ShoppingBag",
      items: [
        {
          title: "Browse Feed",
          details: "Explore active listings from local farmers. You can filter the listings by City (e.g. Nairobi) or Commodity (e.g. Potato) using the search boxes."
        },
        {
          title: "Placing Orders",
          details: "Click 'Buy Now' on any listing to open the order modal. Select the quantity you want to purchase and click 'Confirm Order'."
        },
        {
          title: "My Orders Tab",
          details: "Monitor the status of your orders. When a farmer marks an order as 'Delivered', you'll receive a prompt to 'Confirm Receipt' or file a dispute if there is an issue."
        },
        {
          title: "Inbox Tab",
          details: "Communicate directly with farmers before or after ordering. Click 'Chat' on a product listing to message them."
        }
      ]
    }
  ]
};
