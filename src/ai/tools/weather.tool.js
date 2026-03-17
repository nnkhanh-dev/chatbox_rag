import { tool } from "@langchain/core/tools";
import { z } from "zod";

/**
 * Weather Tool - Lấy thông tin thời tiết từ Open-Meteo API
 * API miễn phí, không cần API key
 */
export const getWeather = tool(
    async ({ location }) => {
        try {
            // 1. Geocoding - Lấy tọa độ từ tên địa điểm
            const geoUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1`;
            
            const geoResponse = await fetch(geoUrl, {
                headers: {
                    'User-Agent': '5Sao-ChatApp/1.0'
                }
            });

            if (!geoResponse.ok) {
                throw new Error(`Không thể tìm thấy địa điểm: ${location}`);
            }

            const geoData = await geoResponse.json();
            
            if (!geoData || geoData.length === 0) {
                return `Không tìm thấy địa điểm "${location}".`;
            }

            const { lat, lon } = geoData[0];

            // 2. Lấy thông tin thời tiết từ Open-Meteo
            const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=Asia/Bangkok`;
            
            const weatherResponse = await fetch(weatherUrl);

            if (!weatherResponse.ok) {
                throw new Error('Không thể lấy thông tin thời tiết');
            }

            const weatherData = await weatherResponse.json();
            const current = weatherData.current;

            // Map weather code sang mô tả
            const weatherDescriptions = {
                0: 'Trời quang đãng',
                1: 'Chủ yếu quang đãng',
                2: 'Có mây một phần',
                3: 'Nhiều mây',
                45: 'Có sương mù',
                48: 'Sương mù đóng băng',
                51: 'Mưa phùn nhẹ',
                53: 'Mưa phùn vừa',
                55: 'Mưa phùn dày đặc',
                61: 'Mưa nhỏ',
                63: 'Mưa vừa',
                65: 'Mưa to',
                71: 'Tuyết nhỏ',
                73: 'Tuyết vừa',
                75: 'Tuyết lớn',
                80: 'Mưa rào nhẹ',
                81: 'Mưa rào vừa',
                82: 'Mưa rào to',
                95: 'Dông bão'
            };

            const weatherDesc = weatherDescriptions[current.weather_code] || 'Không xác định';

            return `Thời tiết tại ${location}:
- Nhiệt độ: ${current.temperature_2m}°C
- Độ ẩm: ${current.relative_humidity_2m}%
- Tốc độ gió: ${current.wind_speed_10m} km/h
- Tình trạng: ${weatherDesc}`;

        } catch (error) {
            console.error('Error in getWeather tool:', error);
            return `Lỗi khi lấy thông tin thời tiết: ${error.message}`;
        }
    },
    {
        name: "get_weather",
        description: "Lấy thông tin thời tiết hiện tại tại một địa điểm cụ thể. Trả về nhiệt độ, độ ẩm, tốc độ gió và tình trạng thời tiết.",
        schema: z.object({
            location: z.string().describe("Tên địa điểm cần tra cứu thông tin thời tiết (ví dụ: 'Hà Nội', 'Đà Nẵng', 'TP.HCM')")
        })
    }
);
