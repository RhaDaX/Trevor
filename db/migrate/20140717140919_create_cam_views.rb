class CreateCamViews < ActiveRecord::Migration
  def change
    create_table :cam_views do |t|

      t.timestamps
    end
  end
end
