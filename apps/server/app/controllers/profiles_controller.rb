class ProfilesController < ApplicationController
  before_action :require_authentication

  def show
    user = User.includes(:user_profile, :buyer_profile, :pass_pro_profile).find(Current.session.user_id)

    render json: {
      id: user.id,
      email: user.email_address,
      role: user.role,
      profile: user.user_profile,
      role_details: user.active_role_profile.as_json(include: :address)
    }
  end
end
