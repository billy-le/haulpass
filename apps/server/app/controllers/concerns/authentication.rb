module Authentication
  extend ActiveSupport::Concern

  included do
    before_action :require_authentication
  end

  class_methods do
    def allow_unauthenticated_access(**options)
      skip_before_action :require_authentication, **options
    end
  end

  private
    def authenticated?
      resume_session.present?
    end

    def require_authentication
      resume_session || request_authentication
    end

    def resume_session
      if auth_token = request.headers["Authorization"]&.split(" ")&.last
        return Current.session = Session.find_by(token: auth_token)
      end

      if cookie_token = cookies.signed[:session_id]
        Current.session ||= Session.find_by(token: cookie_token)
      end
    end

    def find_session_by_cookie
      Session.find_by(token: cookies.signed[:session_id]) if cookies.signed[:session_id]
    end

    def request_authentication
      render json: { error: "Authentication required" }, status: :unauthorized
    end

    def start_new_session_for(user)
      user.sessions.create!(user_agent: request.user_agent, ip_address: request.remote_ip).tap do |session|
        Current.session = session
        cookies.signed.permanent[:session_id] = { value: session.token, httponly: true, same_site: :lax, secure: Rails.env.production? }
      end
    end

    def terminate_session
      Current.session&.destroy
      cookies.delete(:session_id)
      Current.session = nil
    end
end
