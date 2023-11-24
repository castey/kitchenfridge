const buyCreditsButton = document.getElementById("buyCreditsButton")
const creditAmountField = document.getElementById("creditAmount")

buyCreditsButton.addEventListener("click", () => {
    console.log("buyCreditsButton pressed!")
    console.log(creditAmountField.value)

    fetch("/buy-credit", {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            amount: creditAmountField.value
        })
    }).then(res => {
        if (res.ok) return res.json();
        return res.json().then(json => Promise.reject(json));
    }).then(({ url }) => {
        window.location = url
    }).catch(e => {
        console.error(e.error);
    })
})

function formatInputOnBlur(input) {
    // Check if the input is not empty
    if (input.value !== '') {
        // Convert the input value to a float and format it to two decimal places
        let value = parseFloat(input.value);
        input.value = value.toFixed(2);
    }
}
