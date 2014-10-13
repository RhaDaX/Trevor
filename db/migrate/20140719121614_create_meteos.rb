class CreateMeteos < ActiveRecord::Migration
  def change
    create_table :meteos do |t|

      t.timestamps
    end
  end
end
