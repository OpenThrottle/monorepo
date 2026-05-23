import { useSearchParams } from 'react-router';
import { Modal } from '@openthrottle/react-router-shadcn';

export interface <%= name %>Props {}

export const <%= name %> = (
  _props: <%= name %>Props,
): React.ReactElement => {
  // Hooks
  const [searchParams, setSearchParams] = useSearchParams();

  // Setup
  const isOpen = searchParams.get('modal') === <%= name %>.id;

  // Handlers
  const onClose = () => {
    const params = new URLSearchParams(searchParams);

    params.delete('modal');
    setSearchParams(params, { preventScrollReset: true });
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuits

  return (
    <Modal
      className="flex max-h-[90vh] w-full md:w-auto md:min-w-[360px] flex-col"
      data-testid="<%= name %>"
      onClose={onClose}
      open={isOpen}
    >
      {/* TODO: Fill in the gaps */}
      <div className="ui-padding">
        <h3 className="ui-heading"><%= name %></h3>
        <p>
          Lorem ipsum dolor sit amet consectetur, adipisicing elit. Doloribus
          distinctio reiciendis mollitia ipsa saepe minus aperiam porro
          aspernatur ea culpa, cum, molestias ab laboriosam assumenda aliquid
          atque possimus nulla aut.
        </p>
      </div>
    </Modal>
  );
};

<%= name %>.id = '<%= nameKebab %>';
