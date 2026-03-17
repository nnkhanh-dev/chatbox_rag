import { tool } from "@langchain/core/tools";
import { z } from "zod";

export const getHomeConstructionInfo = tool(
  async () => {
    const url = `https://dev-api.fivess.vn/v3/app/work-lead-fee`;

    const res = await fetch(url);

    if (!res.ok) {
      throw new Error(`Failed to fetch work lead fee: ${res.statusText}`);
    }

    const json = await res.json();

    const data = json.map(category => ({
      id: category._id,
      name: category.name,

      services: category.workItems?.map(service => ({
        id: service._id,
        title: service.title,
        description: service.description,
        applicationFee: service.applicationFee,

        fields: service.fields?.map(field => ({
          id: field._id,
          title: field.title,
          description: field.description,
          type: field.type,
          isRequired: field.isRequired,

          attributes: field.attributes?.map(attr => ({
            id: attr._id,
            title: attr.title,
            description: attr.description
          }))
        }))
      }))
    }));

    return data;
  },
  {
    name: "get_home_construction_services_info",
    description: "Lấy thông tin về các dịch vụ xây dựng của 5Sao bao gồm cả giá cả",
    schema: z.object({})
  }
);