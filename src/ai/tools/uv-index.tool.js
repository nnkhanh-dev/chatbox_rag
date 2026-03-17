import {tool} from "@langchain/core/tools";
import {z} from "zod";

export const getUVIndex = tool(
    async ({location}) => {

        const geoUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1`;

        const geoResponse = await fetch(geoUrl, {
            headers: {
                'User-Agent': '5Sao-Chatbot/1.0 (chatbot@5sao.com)' // Required by Nominatim
            }
        });

        if (!geoResponse.ok) {
            throw new Error(`Failed to fetch geocoding data: ${geoResponse.statusText}`);
        }

        const geoData = await geoResponse.json();

        if (!geoData || geoData.length === 0) {
            throw new Error(`Không tìm thấy địa điểm: ${location}`);
        }

        const uvIndexUrl = `https://currentuvindex.com/api/v1/uvi?latitude=${geoData[0].lat}&longitude=${geoData[0].lon}`

        const uvIndexResponse = await fetch(uvIndexUrl);

        if (!uvIndexResponse.ok) {
            throw new Error(`Failed to fetch UV index: ${uvIndexResponse.statusText}`);
        }

        const data = await uvIndexResponse.json();

        return data;
    },
    {
        name: "get_uv_index",
        description: "Lấy chỉ số UV tại một vị trí",
        schema: z.object({
            location: z.string().describe("Tên địa điểm cần tra cứu chỉ số UV")
        })
    }
)