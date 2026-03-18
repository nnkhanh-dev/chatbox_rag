import { tool } from "@langchain/core/tools";
import { z } from "zod";

export const getHomeConstructionBillings = tool(
  async (input) => {
    const { page = 1, limit = 3, status = [2, 3] } = input;

    // Build query parameters
    const params = new URLSearchParams();
    params.append('page', page);
    params.append('limit', limit);
    if (Array.isArray(status) && status.length > 0) {
      params.append('status', JSON.stringify(status));
    }

    const url = `https://dev-api.fivess.vn/v3/app/order-lead-fee?${params.toString()}`;

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
      throw new Error(`Failed to fetch home construction billings: ${res.statusText}`);
    }

    return await res.json();
  },
  {
    name: "get_home_construction_billings",
    description: "Lấy danh sách đơn hàng loại dịch vụ thiết kế thi công nhà của khách hàng. Có thể lọc theo trạng thái đơn hàng (1: Chờ xử lý, 2: Hoàn thành, 3: Đã hủy)",
    schema: z.object({
      page: z.number().int().positive().optional().describe("Trang (mặc định: 1)"),
      limit: z.number().int().positive().optional().describe("Số lượng items mỗi trang (mặc định: 3)"),
      status: z.array(z.number().int().min(1).max(3)).optional().describe("Lọc theo trạng thái đơn hàng. Mặc định: [2, 3] (Hoàn thành, Đã hủy)"),
    }),
  }
);