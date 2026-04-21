class CreateBuyerProfiles < ActiveRecord::Migration[8.1]
  def change
    create_table :buyer_profiles do |t|
      t.references :user, null: false, foreign_key: true

      t.timestamps
    end
  end
end
