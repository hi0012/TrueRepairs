
const handleDeleteAccount = require("../src/unit/deleteaccount")




describe("unit test for handleDeleteAccount function", () => {



  let mockAxios, mockSetMessage, mockClearStorage, mockRedirectPage;


  const deleteAccountRequest = (email, password) => handleDeleteAccount(email,password, mockAxios, mockSetMessage, mockClearStorage, mockRedirectPage);

  beforeEach(() => {
    mockAxios = { 
      post: jest.fn() 
    };


    mockSetMessage = jest.fn();
    mockClearStorage = jest.fn();
    mockRedirectPage = jest.fn();
    jest.useFakeTimers();
    
  });



  // account successfuly deleted with valid data
  test("the handleDeleteAccount successfully deletes the user account", async () => {
    mockAxios.post.mockResolvedValue({ 
      data: { 
        success: true 
      } 
    });

    // test data for email and password
    const result = await deleteAccountRequest("wayne@test.com", "Hello123!");
    

    // what to expect as the outcome
    expect(mockSetMessage).toHaveBeenCalledWith("Account deleted successfully.");
    expect(mockClearStorage).toHaveBeenCalled();

    
    jest.runAllTimers();
    expect(mockRedirectPage).toHaveBeenCalledWith("/?deleted=true");
    expect(result).toBe("success");
  });

  // test the fuction outcome when the request is succesful but the backend denial its as false
  test("shows API message when deletion fails because of the backend denial of the request", async () => {

    const warningMessage = "enter password";


    mockAxios.post.mockResolvedValue({ 
      data: { 
        success: false, message: warningMessage 
      } 
    });

    

    const result = await deleteAccountRequest("wayne@test.com", "");

    // here what to exapect as the outcome for this test, the warning message, remove of user account, redirect to the homepage all fail because the backend denial the request.
    expect(mockSetMessage).toHaveBeenCalledWith(warningMessage);
    expect(mockClearStorage).not.toHaveBeenCalled();
    expect(mockRedirectPage).not.toHaveBeenCalled();


    expect(result).toBe("fail");
  });





  // test the fuction out come when that api fails
  test("display erroe message when the api fails", async () => {



    mockAxios.post.mockRejectedValue(new Error("Server down"));

    // provided valid data because when testing the api failure not the user input 
   
    const result = await deleteAccountRequest("wayne@test.com", "Hello123!");


    // the out come of the function should be the following, which is set the message of displaying the error, clear the user data for account deletion, and redirect the user to the home page all fail because the api stop working
    expect(mockSetMessage).toHaveBeenCalledWith("Error deleting account.");
    expect(mockClearStorage).not.toHaveBeenCalled();

    expect(mockRedirectPage).not.toHaveBeenCalled();
    expect(result).toBe("error");
  });



  afterEach(() => {
    jest.useRealTimers();
    
    jest.clearAllMocks();

  });
});