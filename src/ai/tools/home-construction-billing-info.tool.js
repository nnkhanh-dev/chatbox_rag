import { tool } from "@langchain/core/tools";
import { z } from "zod";

export const getHomeConstructionBillingInfo = tool(
  async ({ id }) => {
    const accessToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2NzJhZGFjMWYyMTFmZTg0MDVlZmRkNzEiLCJpYXQiOjE3NzM2MzUxOTEsImV4cCI6NjE3NzM2MzUxMzEsInR5cGUiOiJhY2Nlc3MifQ.kEshZ9DVm_9WMWEOtw_kE8vKejZ-T7hV0oNiMiwfjxQ";

    const url = `https://dev-api.fivess.vn/v3/app/order-lead-fee/${id}`;

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (res.status === 401) {
      return {
        success: false,
        error: "UNAUTHORIZED",
        message: "Phiên đăng nhập đã hết hạn hoặc token không hợp lệ",
        data: null
      };
    }

    if (!res.ok) {
      return {
        success: false,
        error: "API_ERROR",
        message: `API Error: ${res.status}`,
        data: null
      };
    }

    return await res.json();
  },
  {
    name: "get_home_construction_billing_info",
    description: "Lấy chi tiết đơn hàng dịch vụ thiết kế thi công nhà",
    schema: z.object({
      id: z.string().describe("ID của đơn hàng cần xem chi tiết, lấy từ kết quả của tool get_home_construction_billings")
    }),
  }
);