async function handleDeleteAccount(email, password, axios, setMessage, clearStorage, redirectPage) {


  
  try {
    const res = await axios.post("http://localhost:5000/delete-account", { email, password });

    if (res.data.success) {
      setMessage("Account deleted successfully.");
      clearStorage();
      setTimeout(() => redirectPage("/?deleted=true"), 1500);
      return "success";
    } else {
      setMessage(res.data.message);
      return "fail";
    }
  } catch (err) {
    setMessage("Error deleting account.");
    return "error";
  }

}

module.exports = handleDeleteAccount;