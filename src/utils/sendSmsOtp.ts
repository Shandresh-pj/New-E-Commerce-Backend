// import axios, { AxiosResponse } from "axios";

import axios, { AxiosResponse } from "axios";

interface Fast2SmsResponse {
  return?: boolean;
  request_id?: string;
  message?: string[];
}

const sendSmsOtp = async (
  mobile: string,
  otp: number | string
): Promise<void> => {
  try {
    console.log("Mobile:", mobile);
    console.log("OTP:", otp);

    const response: AxiosResponse<Fast2SmsResponse> =
      await axios.post(
        "https://www.fast2sms.com/dev/bulkV2",
        {
          route: "otp",
          variables_values: otp,
          numbers: mobile,
        },
        {
          headers: {
            authorization:
              process.env.FAST2SMS_API_KEY,
            "Content-Type":
              "application/json",
          },
        }
      );

    console.log(
      "SMS Response:",
      response.data
    );
  } catch (error: any) {
    console.error(
      "FAST2SMS ERROR:",
      error?.response?.data ||
        error?.message
    );

    throw error;
  }
};

export default sendSmsOtp;