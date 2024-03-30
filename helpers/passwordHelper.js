// file: helpers/passwordHelper.js

function generateRandomPassword() {
  const uppercaseLetters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lowercaseLetters = "abcdefghijklmnopqrstuvwxyz";
  const numbers = "0123456789";

  const allCharacters = uppercaseLetters + lowercaseLetters + numbers;

  let password = "";

  // Thêm một ký tự viết hoa ở đầu mật khẩu
  password += uppercaseLetters.charAt(
    Math.floor(Math.random() * uppercaseLetters.length)
  );

  // Thêm các ký tự ngẫu nhiên
  for (let i = 0; i < 7; i++) {
    password += allCharacters.charAt(
      Math.floor(Math.random() * allCharacters.length)
    );
  }

  return password;
}

module.exports = {
  generateRandomPassword: generateRandomPassword,
};
