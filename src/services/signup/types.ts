export interface SignupFormValues {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
}

/** Body sent to POST /api/method/create_user_and_candidate */
export interface CreateUserAndCandidatePayload {
  email: string;
  first_name: string;
  last_name: string;
  name: string;
  password: string;
}
