import Map "mo:core/Map";
import OQL "mo:caffeineai-oql";
import Expose "mo:caffeineai-oql/Expose";
import Entity "mo:caffeineai-oql/Entity";
import MapEntity "mo:caffeineai-oql/MapEntity";
import NatValue "mo:caffeineai-oql/NatValue";
import TextValue "mo:caffeineai-oql/TextValue";
import BoolValue "mo:caffeineai-oql/BoolValue";
import Types "../types/content";

/// Registers the site's editable content as queryable OQL entities so the
/// Data Intelligence agent can answer questions about the birthday content.
mixin (
  greeting : { var value : Types.Greeting },
  messages : Map.Map<Types.MessageId, Types.Message>,
  song : { var value : ?Types.StoredFile },
) {
  include Expose({
    entities = [
      messages.toEntityManual("message", "Message", "id")
        .sample({
          id = 0;
          text = "";
          photo = null;
          crop = null;
          position = 0;
        })
        .payload("id", func m = m.id)
        .payload("text", func m = m.text)
        .payload("position", func m = m.position)
        .payload("hasPhoto", func m = switch (m.photo) {
          case null { false };
          case (?_) { true };
        })
        .controllerOnly()
        .build(),
      OQL.Entity.manual<Types.Greeting>(
        "greeting",
        func () = [greeting.value].values(),
        "Greeting",
        "headline",
      )
        .sample({ headline = ""; subtext = ""; heroPhoto = null; heroCrop = null })
        .payload("headline", func g = g.headline)
        .payload("subtext", func g = g.subtext)
        .payload("hasHeroPhoto", func g = switch (g.heroPhoto) {
          case null { false };
          case (?_) { true };
        })
        .controllerOnly()
        .build(),
      OQL.Entity.manual<?Types.StoredFile>(
        "song",
        func () = [song.value].values(),
        "Song",
        "hasSong",
      )
        .sample(null)
        .payload("hasSong", func s = switch (s) {
          case null { false };
          case (?_) { true };
        })
        .controllerOnly()
        .build(),
    ];
  });
};
