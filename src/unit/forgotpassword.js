function handlePassReset(email, axios, setMessage, closePopup, displayAlert) {
  
  if (!email) {
    displayAlert("Please enter your email first!");
    return;
  }

  return axios.post("http://localhost:5000/forgot-password", { email })
    .then((res) => {
      setMessage(res.data.message || "Reset link sent!");
      setTimeout(() => setMessage(""), 2000);
      setTimeout(() => closePopup(), 2000);
    })
    .catch(() => {
      setMessage("Error sending reset request.");
      setTimeout(() => setMessage(""), 2000);
    });
}

module.exports = handlePassReset;