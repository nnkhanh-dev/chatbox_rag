import { tool } from "@langchain/core/tools";
import { z } from "zod";

export const getHomeCareCategory = tool(
  async () => {
    const url = "https://dev-api.fivess.vn/v3/app/work-item";

    const res = await fetch(url);

    if (!res.ok) {
      throw new Error(`API error: ${res.statusText}`);
    }

    const json = await res.json();

    const data = json.datas.map(x => ({
      id: x._id,
      name: x.name,
      category_id: x.idJobCategory?._id,
      category_name: x.idJobCategory?.name
    }));

    return data;
  },
  {
    name: "get_home_care_category",
    description: "Lấy danh sách danh mục dịch vụ chăm sóc tại nhà của 5Sao",
    schema: z.object({})
  }
);