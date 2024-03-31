// awsTokenManager.js

import AWS from "aws-sdk";

// Hàm để làm mới token
export async function refreshCredentials() {
  // Gọi API AssumeRole để lấy token mới
  const sts = new AWS.STS();
  const params = {
    RoleArn: "arn:aws:iam::your-account-id:role/your-role",
    RoleSessionName: "session-name",
    // Các tham số khác (nếu có)
  };
  const data = await sts.assumeRole(params).promise();

  // Cập nhật client với token mới
  AWS.config.update({
    accessKeyId: data.Credentials.AccessKeyId,
    secretAccessKey: data.Credentials.SecretAccessKey,
    sessionToken: data.Credentials.SessionToken,
    region: "your-region",
  });
}

// Hàm để kiểm tra và làm mới token khi gần hết hạn
function scheduleTokenRefresh() {
  if (AWS.config.credentials.expireTime) {
    console.log(AWS.config.credentials);
    // Xác định thời điểm hiện tại và thời điểm gần hết hạn của token
    const now = new Date();
    const tokenExpirationTime = AWS.config.credentials.expireTime.getTime();

    // Tính toán thời gian cần làm mới token (ví dụ: làm mới 5 phút trước khi hết hạn)
    const refreshTime = tokenExpirationTime - 5 * 60 * 1000; // 5 phút trước khi hết hạn

    // Nếu thời điểm hiện tại gần thời điểm cần làm mới token, thì gọi hàm refreshCredentials
    if (now.getTime() >= refreshTime) {
      refreshCredentials();
    }
  } else {
    refreshCredentials();
  }

  // Lập lịch gọi lại hàm này sau mỗi 1 phút để kiểm tra lại
  setTimeout(scheduleTokenRefresh, 60 * 1000); // 1 phút
}

// Bắt đầu lập lịch kiểm tra và làm mới token
scheduleTokenRefresh();
