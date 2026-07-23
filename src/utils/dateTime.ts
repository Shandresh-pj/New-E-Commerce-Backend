import moment from "moment-timezone";

export const formatDate = (
  date: Date | string,
  timezone = "Asia/Kolkata"
): string => {
  return moment(date)
    .tz(timezone)
    .format("YYYY-MM-DD");
};

export const formatTime = (
  date: Date | string,
  timezone = "Asia/Kolkata"
): string => {
  return moment(date)
    .tz(timezone)
    .format("HH:mm:ss");
};

export const formatDateTime = (
  date: Date | string,
  timezone = "Asia/Kolkata"
): string => {
  return moment(date)
    .tz(timezone)
    .format("YYYY-MM-DD HH:mm:ss");
};

export const nowDate = (
  timezone = "Asia/Kolkata"
): string => {
  return moment()
    .tz(timezone)
    .format("YYYY-MM-DD");
};

export const nowTime = (
  timezone = "Asia/Kolkata"
): string => {

  return moment()
    .tz(timezone)
    .format("HH:mm:ss");
};