import { tool } from "@langchain/core/tools";
import { z } from "zod";

export const getHomeCareBillings = tool(
  async (input) => {
    const { page = 1, limit = 3, status = [5, 6] } = input;

    // Build query parameters
    const params = new URLSearchParams();
    params.append('page', page);
    params.append('limit', limit);
    if (Array.isArray(status) && status.length > 0) {
      params.append('status', JSON.stringify(status));
    }

    const url = `https://dev-api.fivess.vn/v3/app/order-transaction?${params.toString()}`;

    const accessToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2OTlmZWMyNTE3ZjI4YWVkN2I4Y2U1MzciLCJpYXQiOjE3NzM3OTczMzEsImV4cCI6NjE3NzM3OTcyNzEsInR5cGUiOiJhY2Nlc3MifQ.Pp7ZNgNvpz2rupsQa8jsulbn92MyOiLMlaymXPP8aYY";

    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (res.status === 401) {
      throw new Error("Unauthorized: Token không hợp lệ hoặc đã hết hạn");
    }

    if (!res.ok) {
      throw new Error(`Failed to fetch home care billings: ${res.statusText}`);
    }

    return await res.json();
  },
  {
    name: "get_home_care_billings",
    description: "Lấy danh sách đơn hàng dịch vụ chăm sóc nhà của người dùng. Có thể lọc theo trạng thái đơn hàng (0: Chờ thanh toán, 1: Tìm đối tác, 2: Pending, 3: Sắp tới, 4: Đang xử lý, 5: Hoàn thành, 6: Đã hủy)",
    schema: z.object({
      page: z.number().int().positive().optional().describe("Trang (mặc định: 1)"),
      limit: z.number().int().positive().optional().describe("Số lượng items mỗi trang (mặc định: 3)"),
      status: z.array(z.number().int().min(0).max(6)).optional().describe("Lọc theo trạng thái đơn hàng. Mặc định: [5, 6] (Hoàn thành, Đã hủy)"),
    }),
  }
);