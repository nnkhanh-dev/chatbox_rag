import { tool } from "@langchain/core/tools";
import { z } from "zod";

export const getHomeCareInfo = tool(
  async () => {
    const url = `https://dev-api.fivess.vn/v3/app/work-item`

    const res = await fetch(url);

    if (!res.ok) {
        throw new Error(`Failed to fetch work item: ${res.statusText}`);
    }

    const json = await res.json();

    const data = json.datas.map(x => ({
      id: x._id,
      name: x.name,
      services: x.services
    }));

    return data;
  },
  {
    name: "get_home_care_services_info",
    description: "Lấy thông tin về các dịch vụ chăm sóc tại nhà của 5Sao bao gồm cả giá dịch vụ chung, giá dịch vụ chi tiết, quy trình dịch vụ, bảo hành dịch vụ, dịch vụ phổ biến",
    schema: z.object({})
  }
);