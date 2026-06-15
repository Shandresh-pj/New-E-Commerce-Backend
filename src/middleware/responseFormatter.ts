import moment from "moment-timezone";

export const responseFormatter = (
  req: any,
  res: any,
  next: any
) => {

  const oldJson = res.json;

  res.json = function (data: any) {

    const timezone =
      req.clientTimezone ||
      "Asia/Kolkata";

    const convert = (obj: any): any => {

      if (!obj) return obj;

      if (Array.isArray(obj)) {
        return obj.map(convert);
      }

      if (
        typeof obj === "object"
      ) {

        for (const key in obj) {

          const value = obj[key];

          if (
            value instanceof Date
          ) {

            obj[key] = moment(value)
              .tz(timezone)
              .format(
                "DD:MM:YYYY HH:mm:ss"
              );
          }

          if (
            typeof value === "object"
          ) {

            convert(value);
          }
        }
      }

      return obj;
    };

    return oldJson.call(
      this,
      convert(data)
    );
  };

  next();
};