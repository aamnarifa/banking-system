fetch("http://localhost:3000/api/v1/auth/register", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ name: "testjs2", email: "testjs2@gmail.com", password: "short" })
}).then(async r => {
  const text = await r.text();
  console.log("Status:", r.status);
  console.log("Response:", text);
}).catch(console.error);
