const dataSource: any = require("../server");

type ErrorLogEntity = {
  Controller: string;
  Method: string;
  Action: string;
  Url: string;
  BodyData: unknown;
  Response: unknown;
  CreatedAt: Date;
};

export const ErrorLogFun = async (
  controller: string,
  method: string,
  action: string,
  url: string,
  bodyData: unknown,
  response: unknown
): Promise<any | null> => {
  try {
    const errorLog: ErrorLogEntity = {
      Controller: controller,
      Method: method,
      Action: action,
      Url: url,
      BodyData: bodyData,
      Response: response,
      CreatedAt: new Date(),
    };

    return await dataSource.getRepository("ErrorLog").save(errorLog);
  } catch (error) {
    console.error("Error saving error log:", error);
    return null;
  }
};