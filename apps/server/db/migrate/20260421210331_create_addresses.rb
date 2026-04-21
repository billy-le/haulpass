class CreateAddresses < ActiveRecord::Migration[8.1]
  def change
    create_table :addresses do |t|
      t.references :addressable, polymorphic: true, index: true

      t.string :street1, null: false
      t.string :street2
      t.string :city, null: false
      t.string :state, null: false, limit: 2
      t.string :postal_code, null: false

      t.decimal :latitude, precision: 10, scale: 8
      t.decimal :longitude, precision: 11, scale: 8

      t.timestamps
    end

    add_index :addresses, [:city, :state]
  end
end
