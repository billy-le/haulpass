class Address < ApplicationRecord
  belongs_to :addressable, polymorphic: true

  validates :street1, :city, :state, :postal_code, presence: true
  validates :state, length: { is: 2 }
end
