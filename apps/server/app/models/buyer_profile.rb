class BuyerProfile < ApplicationRecord
  belongs_to :user
  has_one :address, as: :addressable, dependent: :destroy
end
