// utils.js

export function decodeUint8Array(uintArray) {
  const decoder = new TextDecoder("utf-8");
  const decodedString = decoder.decode(uintArray);
  return JSON.parse(decodedString);
}

export function encodeUint8Array(data) {
  const jsonString = JSON.stringify(data);
  const encoder = new TextEncoder();
  return encoder.encode(jsonString);
}

export function checkTimeThreshold(lastModifiedTime, second) {
  // Lấy thời gian hiện tại
  const currentTime = new Date();
  // Ngưỡng thời gian cần kiểm tra
  const thresholdSeconds = second;
  // Tính toán khoảng cách thời gian trong giây
  const diffInSeconds = Math.abs((currentTime - lastModifiedTime) / 1000);

  const isWithinThreshold = diffInSeconds <= thresholdSeconds;
  return isWithinThreshold;
}
