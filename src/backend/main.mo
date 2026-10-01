import Map "mo:core/Map";
import AccessControl "mo:caffeineai-authorization/access-control";
import MixinAuthorization "mo:caffeineai-authorization/MixinAuthorization";
import MixinObjectStorage "mo:caffeineai-object-storage/Mixin";
import Types "types/content";
import ContentApi "mixins/content-api";
import ApiDocMixin "mixins/api-doc";
import OqlMixin "mixins/oql";

actor {
  let accessControlState : AccessControl.AccessControlState;
  include MixinAuthorization(accessControlState, null);

  include MixinObjectStorage();

  let greeting : { var value : Types.Greeting };
  let messages : Map.Map<Types.MessageId, Types.Message>;
  let song : { var value : ?Types.StoredFile };
  let songUrl : { var value : ?Text };
  let nextMessageId : { var value : Nat };

  include ContentApi(accessControlState, greeting, messages, song, songUrl, nextMessageId);

  include ApiDocMixin();

  include OqlMixin(greeting, messages, song);
};
