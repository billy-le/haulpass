class User < ApplicationRecord
  has_secure_password
  has_many :sessions, dependent: :destroy

  enum :role, { admin: 0, buyer: 1, pass_pro: 2 }

  has_one :user_profile, dependent: :destroy
  has_one :buyer_profile, dependent: :destroy
  has_one :pass_pro_profile, dependent: :destroy

  normalizes :email_address, with: ->(e) { e.strip.downcase }

  def active_role_profile
    case role
    when "buyer"
      buyer_profile
    when "pass_pro"
      pass_pro_profile
    else
      nil # For admins or unassigned roles
    end
  end


  after_create :create_associated_profiles

  private

  def create_associated_profiles
    # Every user gets a basic name/avatar profile
    create_user_profile!

    # Create the specific role profile based on selection
    case role
    when "buyer"
      create_buyer_profile!
    when "pass_pro"
      create_pass_pro_profile!
    end
  end
 end
