class SessionsController < ApplicationController
  allow_unauthenticated_access only: %i[ create ]

  rate_limit to: 10, within: 3.minutes, only: :create, with: -> { 
    render json: { error: "Try again later" }, status: :too_many_requests
  }

  def create
    if user = User.authenticate_by(params.permit(:email_address, :password))
      session = start_new_session_for(user)

      render json: { 
        token: session.token,
        user: user.slice(:id, :email_address), 
      }, status: :created
    else
      render json: { error: "Invalid email or password" }, status: :unauthorized
    end
  end

  def destroy
    terminate_session
    head :no_content
  end
end
