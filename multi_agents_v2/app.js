import { product_manager_ghost } from "./product_manager.js";

const app_func = async () => {
  const res = await product_manager_ghost({
    conversation: [
      {
        role: "user",
        content: "I want to build an ecommerce application",
      },
      {
        role: "assistant",
        content: `What specific features or functionalities are you looking to include in the ecommerce application?`,
      },
      {
        role: "user",
        content:
          "I want to build a simple application where i can showcase my products and people can place the order from there, no inventory management.",
      },
    ],
  });

  console.log(JSON.stringify(res, null, 2));
};

app_func();
