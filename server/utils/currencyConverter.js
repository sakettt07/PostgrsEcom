import axios from "axios";;
export const getUSDToINRRate=async()=>{
    const primaryUrl =
    "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json";
  const fallbackUrl =
    "https://latest.currency-api.pages.dev/v1/currencies/usd.json";

    try {
        const response=await axios.get(primaryUrl);
        return response.data.usd.inr;
    } catch (error) {
        console.log("Primary currencty convertor failed trying fallback...",error);
        try {
            const response=await axios.get(fallbackUrl);
            return response.data.usd.inr;
        } catch (error) {
            console.log("Fallback failed using default --88");
            return 88;
        }
    }
}