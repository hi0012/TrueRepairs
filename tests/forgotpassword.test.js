const handlePassReset = require("../src/unit/forgotpassword");
jest.useFakeTimers();



describe("handlePassReset unit testing", () => {
  let fakeAxios, fakeSetMessage, fakeClosePopup, fakeDisplayAlert;

  beforeEach(() => {
    fakeAxios = { 
        post: jest.fn() 

    };


    fakeSetMessage = jest.fn(); 

    fakeClosePopup = jest.fn();
    fakeDisplayAlert = jest.fn();
  });

  // test the when no email is in the text field.
  test("display alert when email text field is empty", () => {
    handlePassReset("", fakeAxios, fakeSetMessage, fakeClosePopup, fakeDisplayAlert);
    expect(fakeDisplayAlert).toHaveBeenCalledWith("Please enter your email first!");

    // make sure it does not acutally send a api request because this is just testing purposes for the sencario when user enters no email address
    expect(fakeAxios.post).not.toHaveBeenCalled();
  });

  test("sends request and shows success message", async () => {

    fakeAxios.post.mockResolvedValue({ 
        data: { 
            message: "Reset link sent!" 
        } 
    });



    // the expected results are as followed below
    await handlePassReset("benny@test.com", fakeAxios, fakeSetMessage, fakeClosePopup, fakeDisplayAlert);



    expect(fakeAxios.post).toHaveBeenCalledWith("http://localhost:5000/forgot-password", { 

      email: "benny@test.com" 
    });

    expect(fakeSetMessage).toHaveBeenCalledWith("Reset link sent!");

    jest.runAllTimers();

    expect(fakeSetMessage).toHaveBeenCalledWith("");



    expect(fakeClosePopup).toHaveBeenCalled();
  });

  test("test error message when API fail", async () => {
    // making the api fail on purpose
    fakeAxios.post.mockRejectedValue(new Error("fail"));


    // the passing the test data into the fucntion, for outcome of the test.
    await handlePassReset("bennt@test.com", fakeAxios, fakeSetMessage, fakeClosePopup, fakeDisplayAlert);

    //the expected results are listed below
    expect(fakeSetMessage).toHaveBeenCalledWith("Error sending reset request.");
    jest.runAllTimers();
    expect(fakeSetMessage).toHaveBeenCalledWith("");


    expect(fakeClosePopup).not.toHaveBeenCalled();
  });
});

// Ishmeal Gonzales {100%}