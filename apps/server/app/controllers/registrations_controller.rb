class RegistrationsController < ApplicationController
  allow_unauthenticated_access only: :create
  before_action :resume_session, only: :destroy

  def create
    @user = User.new(registration_params)
    if @user.save
      session_record = @user.sessions.create!

      puts session_record

      render json: {
        token: session_record.id,
        user: { id: @user.id, email: @user.email_address }
      }, status: :created
    else
      render json: {
        errors: @user.errors.full_messages
      }, status: :unprocessable_entity
    end
  end

  def destroy
    if Current.user.destroy
      head :no_content
    else
      render json: {
        error: "Failed to delete account"
      }, status: :unprocessable_entity
    end
  end

  private
    def registration_params
      params.permit(:email_address, :password, :password_confirmation)
    end
end
