async function test() {
    try {
        const res = await fetch("https://new-e-commerce-backend-xt4w.onrender.com/api/products", {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            }
        });
        const text = await res.text();
        console.log("Status:", res.status);
        console.log("Body:", text);
    } catch (err) {
        console.error(err);
    }
}
test();
